const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


let gameState = {
    x: 320,
    y: 224,
    roblox_x: 0,
    roblox_y: 0,
    timestamp: Date.now(),
    lastUpdate: Date.now(),
    isStale: false,
    updateCount: 0
};


function logRequest(method, endpoint, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${method} ${endpoint}`);
    if (data) {
        console.log(`Data:`, JSON.stringify(data));
    }
}


function validateCoordinates(x, y) {
    const numX = Number(x);
    const numY = Number(y);
    
    return {
        x: isNaN(numX) ? 320 : Math.max(0, Math.min(640, numX)),
        y: isNaN(numY) ? 224 : Math.max(0, Math.min(448, numY))
    };
}


function calculateRobloxCoords(x, y) {
    const roblox_x = Math.floor(((x / 640.0) - 0.5) * 100.0);
    const roblox_y = Math.floor(((y / 448.0) - 0.5) * 100.0);
    return { roblox_x, roblox_y };
}


app.get('/', (req, res) => {
    logRequest('GET', '/');
    res.json({
        status: 'PS2 to Roblox Bridge Server',
        version: '2.0',
        endpoints: {
            'GET /position': 'Get current position',
            'POST /move': 'Update position (recommended)',
            'GET /move': 'Update position via GET',
            'GET /status': 'Server status'
        },
        uptime: process.uptime(),
        lastUpdate: gameState.lastUpdate
    });
});


app.post('/move', (req, res) => {
    logRequest('POST', '/move', req.body);
    
    try {
        const { x, y, roblox_x, roblox_y, timestamp } = req.body;
        
        
        const validCoords = validateCoordinates(x, y);
        
       
        const robloxCoords = (roblox_x !== undefined && roblox_y !== undefined) 
            ? { roblox_x: Number(roblox_x), roblox_y: Number(roblox_y) }
            : calculateRobloxCoords(validCoords.x, validCoords.y);
        

        gameState = {
            x: validCoords.x,
            y: validCoords.y,
            roblox_x: robloxCoords.roblox_x,
            roblox_y: robloxCoords.roblox_y,
            timestamp: timestamp || Date.now(),
            lastUpdate: Date.now(),
            isStale: false,
            updateCount: gameState.updateCount + 1
        };
        
        console.log(`Position updated: PS2(${gameState.x}, ${gameState.y}) -> Roblox(${gameState.roblox_x}, ${gameState.roblox_y})`);
        
        res.json({
            success: true,
            position: gameState,
            message: 'Position updated successfully'
        });
        
    } catch (error) {
        console.error('Error in POST /move:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});


app.get('/move', (req, res) => {
    logRequest('GET', '/move', req.query);
    
    try {
        const { x, y, roblox_x, roblox_y, timestamp } = req.query;
        

        const validCoords = validateCoordinates(x, y);
        
   
        const robloxCoords = (roblox_x !== undefined && roblox_y !== undefined) 
            ? { roblox_x: Number(roblox_x), roblox_y: Number(roblox_y) }
            : calculateRobloxCoords(validCoords.x, validCoords.y);
        

        gameState = {
            x: validCoords.x,
            y: validCoords.y,
            roblox_x: robloxCoords.roblox_x,
            roblox_y: robloxCoords.roblox_y,
            timestamp: timestamp ? Number(timestamp) : Date.now(),
            lastUpdate: Date.now(),
            isStale: false,
            updateCount: gameState.updateCount + 1
        };
        
        console.log(`Position updated via GET: PS2(${gameState.x}, ${gameState.y}) -> Roblox(${gameState.roblox_x}, ${gameState.roblox_y})`);
        
        res.json({
            success: true,
            position: gameState,
            message: 'Position updated via GET'
        });
        
    } catch (error) {
        console.error('Error in GET /move:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});


app.get('/position', (req, res) => {
  
    const now = Date.now();
    const dataAge = now - gameState.lastUpdate;
    const isStale = dataAge > 5000;
    
    if (isStale && !gameState.isStale) {
        gameState.isStale = true;
        console.log(`Data is stale (${dataAge}ms old)`);
    }
    
    res.json({
        ...gameState,
        isStale,
        dataAge,
        serverTime: now
    });
});


app.get('/status', (req, res) => {
    logRequest('GET', '/status');
    
    const now = Date.now();
    const dataAge = now - gameState.lastUpdate;
    
    res.json({
        server: 'PS2 to Roblox Bridge',
        status: 'running',
        uptime: process.uptime(),
        connections: {
            ps2: dataAge < 5000 ? 'connected' : 'disconnected',
            dataAge: dataAge,
            lastUpdate: new Date(gameState.lastUpdate).toISOString()
        },
        position: gameState,
        stats: {
            totalUpdates: gameState.updateCount
        }
    });
});


app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        available_routes: ['/', '/position', '/move', '/status']
    });
});


app.listen(PORT, '0.0.0.0', () => {
    console.log('=================================');
    console.log('🎮 PS2 to Roblox Bridge Server');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('📡 Endpoints:');
    console.log('   GET  / - Server info');
    console.log('   POST /move - Update position (PS2)');
    console.log('   GET  /move - Update position via GET (PS2)');
    console.log('   GET  /position - Get position (Roblox)');
    console.log('   GET  /status - Server status');
    console.log('=================================');
    
  
    gameState = {
        x: 320,
        y: 224,
        roblox_x: 0,
        roblox_y: 0,
        timestamp: Date.now(),
        lastUpdate: Date.now(),
        isStale: false,
        updateCount: 0
    };
});


process.on('SIGTERM', () => {
    console.log('Server shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Server shutting down...');
    process.exit(0);
});
