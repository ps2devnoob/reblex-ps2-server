

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.text());

let currentPosition = { x: 0, y: 0 };
let lastUpdate = Date.now();
let updateCount = 0;

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});


app.post('/move', (req, res) => {
    try {
        let data;
        if (typeof req.body === 'string') {
            data = JSON.parse(req.body);
        } else {
            data = req.body;
        }
        
        const { x, y, roblox_x, roblox_y } = data;
        
        if (x === undefined || y === undefined) {
            return res.status(400).json({ error: 'Missing coordinates' });
        }
        
        if (roblox_x !== undefined && roblox_y !== undefined) {
            currentPosition.x = roblox_x;
            currentPosition.y = roblox_y;
        } else {
            currentPosition.x = ((x / 640) - 0.5) * 100;
            currentPosition.y = ((y / 448) - 0.5) * 100;
        }
        
        lastUpdate = Date.now();
        updateCount++;
        
        res.json({
            status: 'ok',
            received: { x, y },
            converted: currentPosition,
            timestamp: lastUpdate
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/position', (req, res) => {
    const timeSinceUpdate = Date.now() - lastUpdate;
    
    res.json({
        ...currentPosition,
        lastUpdate: lastUpdate,
        timeSinceUpdate: timeSinceUpdate,
        isStale: timeSinceUpdate > 5000
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        totalUpdates: updateCount,
        currentPosition: currentPosition
    });
});

app.get('/', (req, res) => {
    res.send(`
        <html>
        <body>
            <h1>PS2 -> Roblox Bridge</h1>
            <p>Status: <span style="color: green;">Online</span></p>
            <p>Position: <span id="pos">Loading...</span></p>
            <script>
                setInterval(() => {
                    fetch('/position')
                        .then(r => r.json())
                        .then(data => {
                            document.getElementById('pos').textContent = 
                                'X: ' + data.x.toFixed(2) + ', Y: ' + data.y.toFixed(2);
                        });
                }, 100);
            </script>
        </body>
        </html>
    `);
});


const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
});