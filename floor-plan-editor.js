let canvas, ctx;
let floorPlanImage = null;
let nodes = [];
let edges = [];
let mode = 'node';
let selectedNode = null;
let scale = null;
let scalePoints = [];

// Initialize
window.onload = function() {
    canvas = document.getElementById('floorPlanCanvas');
    ctx = canvas.getContext('2d');
    
    loadData();
    resizeCanvas();
    
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('click', handleCanvasClick);
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    
    updateStats();
    render();
};

function resizeCanvas() {
    const container = document.getElementById('canvasArea');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    render();
}

// Handle floor plan upload
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            floorPlanImage = img;
            localStorage.setItem('floorPlanImage', event.target.result);
            resizeCanvas();
            alert('✅ Floor plan uploaded! Now set the scale.');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Set scale
function setScale() {
    if (scalePoints.length !== 2) {
        alert('⚠️ Please click TWO points on the floor plan first!');
        return;
    }
    
    const knownDistance = parseFloat(document.getElementById('knownDistance').value);
    if (!knownDistance || knownDistance <= 0) {
        alert('⚠️ Please enter a valid distance');
        return;
    }
    
    const pixelDistance = Math.sqrt(
        Math.pow(scalePoints[1].x - scalePoints[0].x, 2) +
        Math.pow(scalePoints[1].y - scalePoints[0].y, 2)
    );
    
    scale = pixelDistance / knownDistance;
    localStorage.setItem('scale', scale.toString());
    
    document.getElementById('scaleStatus').innerHTML = 
        `✅ Scale set! ${scale.toFixed(2)} pixels = 1 meter`;
    
    scalePoints = [];
    render();
}

// Mode switching
function setMode(newMode) {
    mode = newMode;
    selectedNode = null;
    
    document.getElementById('nodeModeBtn').classList.remove('active');
    document.getElementById('edgeModeBtn').classList.remove('active');
    
    if (newMode === 'node') {
        document.getElementById('nodeModeBtn').classList.add('active');
        document.getElementById('nodeSection').style.display = 'block';
        document.getElementById('edgeSection').style.display = 'none';
    } else {
        document.getElementById('edgeModeBtn').classList.add('active');
        document.getElementById('nodeSection').style.display = 'none';
        document.getElementById('edgeSection').style.display = 'block';
        document.getElementById('connectionStatus').innerHTML = 'Click first room...';
    }
    
    render();
}

// Handle canvas clicks
function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Setting scale - need 2 points
    if (scale === null) {
        scalePoints.push({x, y});
        render();
        if (scalePoints.length === 2) {
            alert('✅ Two points marked! Now enter the actual distance and click "Set Scale"');
        }
        return;
    }
    
    // Node mode - add new node
    if (mode === 'node') {
        const name = document.getElementById('nodeName').value.trim();
        if (!name) {
            alert('⚠️ Please enter a room name first!');
            return;
        }
        
        const type = document.getElementById('nodeType').value;
        const floor = parseInt(document.getElementById('nodeFloor').value);
        
        const newNode = {
            id: 'n' + Date.now(),
            name: name,
            type: type,
            floor: floor,
            x: x,
            y: y
        };
        
        nodes.push(newNode);
        document.getElementById('nodeName').value = '';
        
        updateNodesList();
        updateStats();
        render();
    }
    
    // Edge mode - connect nodes
    if (mode === 'edge') {
        const clickedNode = findNodeAt(x, y);
        
        if (clickedNode) {
            if (!selectedNode) {
                selectedNode = clickedNode;
                document.getElementById('connectionStatus').innerHTML = 
                    `Selected: <strong>${selectedNode.name}</strong><br>Click second room...`;
                render();
            } else {
                if (selectedNode.id !== clickedNode.id) {
                    // Check if connection already exists
                    const exists = edges.some(e => 
                        (e.from === selectedNode.id && e.to === clickedNode.id) ||
                        (e.to === selectedNode.id && e.from === clickedNode.id)
                    );
                    
                    if (exists) {
                        alert('⚠️ These rooms are already connected!');
                    } else {
                        const pixelDistance = Math.sqrt(
                            Math.pow(clickedNode.x - selectedNode.x, 2) +
                            Math.pow(clickedNode.y - selectedNode.y, 2)
                        );
                        const meterDistance = Math.round(pixelDistance / scale);
                        
                        const newEdge = {
                            id: 'e' + Date.now(),
                            from: selectedNode.id,
                            to: clickedNode.id,
                            distance: meterDistance
                        };
                        
                        edges.push(newEdge);
                        alert(`✅ Connected!\n${selectedNode.name} ↔ ${clickedNode.name}\nDistance: ${meterDistance}m`);
                        updateStats();
                    }
                }
                selectedNode = null;
                document.getElementById('connectionStatus').innerHTML = 'Click first room...';
                render();
            }
        }
    }
}

// Find node at coordinates
function findNodeAt(x, y) {
    for (let node of nodes) {
        const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
        if (distance < 15) {
            return node;
        }
    }
    return null;
}

// Render canvas
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw floor plan
    if (floorPlanImage) {
        const imgScale = Math.min(
            canvas.width / floorPlanImage.width,
            canvas.height / floorPlanImage.height
        );
        const width = floorPlanImage.width * imgScale;
        const height = floorPlanImage.height * imgScale;
        const x = (canvas.width - width) / 2;
        const y = (canvas.height - height) / 2;
        ctx.drawImage(floorPlanImage, x, y, width, height);
    }
    
    // Draw scale points
    scalePoints.forEach((point, i) => {
        ctx.fillStyle = '#FF9800';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.fillText((i + 1).toString(), point.x - 4, point.y + 5);
    });
    
    if (scalePoints.length === 2) {
        ctx.strokeStyle = '#FF9800';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(scalePoints[0].x, scalePoints[0].y);
        ctx.lineTo(scalePoints[1].x, scalePoints[1].y);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // Draw edges
    edges.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        
        if (fromNode && toNode) {
            ctx.strokeStyle = '#2196F3';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.stroke();
            
            // Distance label
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            
            ctx.fillStyle = 'white';
            ctx.strokeStyle = '#2196F3';
            ctx.lineWidth = 2;
            
            const text = edge.distance + 'm';
            const textWidth = ctx.measureText(text).width;
            
            ctx.beginPath();
            ctx.roundRect(midX - textWidth/2 - 8, midY - 12, textWidth + 16, 24, 4);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = '#2196F3';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(text, midX - textWidth/2, midY + 5);
        }
    });
    
    // Draw nodes
    nodes.forEach(node => {
        const colors = {
            'room': '#F44336',
            'landmark': '#FF9800',
            'hallway': '#9E9E9E',
            'stairs': '#9C27B0',
            'elevator': '#673AB7'
        };
        
        const color = colors[node.type] || '#F44336';
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Highlight selected
        if (selectedNode && selectedNode.id === node.id) {
            ctx.strokeStyle = '#FFEB3B';
            ctx.lineWidth = 5;
            ctx.stroke();
        }
        
        // Label
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        const textWidth = ctx.measureText(node.name).width;
        ctx.fillRect(node.x + 18, node.y - 12, textWidth + 12, 24);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 13px Arial';
        ctx.fillText(node.name, node.x + 24, node.y + 4);
    });
}

// Update nodes list
function updateNodesList() {
    let html = '';
    nodes.forEach((node, index) => {
        const icons = {
            'room': '🚪',
            'landmark': '📍',
            'hallway': '🚶',
            'stairs': '🪜',
            'elevator': '🛗'
        };
        html += `
            <div class="node-item">
                ${icons[node.type]} <strong>${node.name}</strong><br>
                <small>${node.type} • Floor ${node.floor}</small>
            </div>
        `;
    });
    document.getElementById('nodesList').innerHTML = html || 
        '<p style="text-align: center; color: #999; padding: 20px;">No locations added yet</p>';
}

// Update stats
function updateStats() {
    document.getElementById('nodeCount').textContent = nodes.length;
    document.getElementById('edgeCount').textContent = edges.length;
}

// Save data
function saveData() {
    localStorage.setItem('nodes', JSON.stringify(nodes));
    localStorage.setItem('edges', JSON.stringify(edges));
    alert('✅ Data saved successfully!');
}

// Load data
function loadData() {
    nodes = JSON.parse(localStorage.getItem('nodes') || '[]');
    edges = JSON.parse(localStorage.getItem('edges') || '[]');
    scale = parseFloat(localStorage.getItem('scale')) || null;
    
    const savedImage = localStorage.getItem('floorPlanImage');
    if (savedImage) {
        const img = new Image();
        img.onload = function() {
            floorPlanImage = img;
            render();
        };
        img.src = savedImage;
    }
    
    if (scale) {
        document.getElementById('scaleStatus').innerHTML = 
            `✅ Scale loaded: ${scale.toFixed(2)} pixels = 1 meter`;
    }
    
    updateNodesList();
}

// Clear all
function clearAll() {
    if (!confirm('⚠️ Delete EVERYTHING? This cannot be undone!')) return;
    
    nodes = [];
    edges = [];
    scale = null;
    scalePoints = [];
    floorPlanImage = null;
    selectedNode = null;
    
    localStorage.clear();
    
    updateNodesList();
    updateStats();
    render();
    
    document.getElementById('scaleStatus').innerHTML = '';
    alert('✅ All data cleared');
}

// Helper for rounded rectangles
CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
    this.moveTo(x + radius, y);
    this.lineTo(x + width - radius, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.lineTo(x + width, y + height - radius);
    this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.lineTo(x + radius, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
};