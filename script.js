/* DOM Elements */
const mapArea = document.getElementById("mapArea");
const svgConnections = document.getElementById("connections");
const nodeInput = document.getElementById("nodeText");
const form = document.getElementById("nodeForm");

/* State */
let nodes = JSON.parse(localStorage.getItem("nodes")) || [];
let selectedNodeId = null;

/* Constants */
const DEFAULT_X = 50;
const DEFAULT_Y = 50;

/* --- INITIALIZATION --- */
window.addEventListener("DOMContentLoaded", () => {
    renderMap();
});

/* --- CORE FUNCTIONS --- */

// Scroll Helper
window.scrollToSection = function (id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// Create Node Data
function addNode(text) {
    if (!text.trim()) return;

    const newNode = {
        id: Date.now(), // Unique ID
        text: text,
        // If a node is selected, spawn near it, else spawn random/default
        x: selectedNodeId ? getNodeById(selectedNodeId).x + 150 : DEFAULT_X + (Math.random() * 50),
        y: selectedNodeId ? getNodeById(selectedNodeId).y + (Math.random() * 50) : DEFAULT_Y + (nodes.length * 50),
        parentId: selectedNodeId // Link to selected node
    };

    nodes.push(newNode);
    renderMap();
    saveData();
    nodeInput.value = "";
}

function getNodeById(id) {
    return nodes.find(n => n.id === id);
}

// Render Everything (Nodes + Lines)
function renderMap() {
    // 1. Clean up DOM (remove old nodes, keep SVG container but empty it)
    document.querySelectorAll(".node").forEach(n => n.remove());
    while (svgConnections.firstChild) {
        svgConnections.removeChild(svgConnections.firstChild);
    }

    // 2. Draw Nodes
    nodes.forEach(node => {
        createNodeElement(node);
    });

    // 3. Draw Lines
    nodes.forEach(node => {
        if (node.parentId) {
            const parent = getNodeById(node.parentId);
            if (parent) {
                drawLine(parent, node);
            }
        }
    });
}

// Create the HTML Element for a Node
function createNodeElement(nodeData) {
    let nodeEl = document.createElement("div");
    nodeEl.className = "node";
    if (nodeData.id === selectedNodeId) nodeEl.classList.add("selected");

    nodeEl.textContent = nodeData.text;
    nodeEl.style.left = nodeData.x + "px";
    nodeEl.style.top = nodeData.y + "px";
    nodeEl.id = "node-" + nodeData.id;

    // --- EVENTS ---

    // Select
    nodeEl.addEventListener("click", (e) => {
        e.stopPropagation(); // Stop clicking map
        selectedNodeId = nodeData.id;
        renderMap(); // Redraw to update styles/future lines
    });

    // Edit
    nodeEl.addEventListener("dblclick", () => {
        let newText = prompt("Edit idea:", nodeData.text);
        if (newText) {
            nodeData.text = newText;
            renderMap();
            saveData();
        }
    });

    // Delete (Right Click)
    nodeEl.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (confirm("Delete this node?")) {
            deleteNode(nodeData.id);
        }
    });

    // Drag Start
    nodeEl.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return; // Left click only
        startDrag(e, nodeData);
    });

    mapArea.appendChild(nodeEl);
}

// Drag Logic
function startDrag(e, nodeData) {
    e.preventDefault(); // Prevent text selection
    let startX = e.clientX;
    let startY = e.clientY;
    let initialLeft = nodeData.x;
    let initialTop = nodeData.y;

    function onMouseMove(moveEvent) {
        let dx = moveEvent.clientX - startX;
        let dy = moveEvent.clientY - startY;

        nodeData.x = initialLeft + dx;
        nodeData.y = initialTop + dy;

        // Live Update
        let el = document.getElementById("node-" + nodeData.id);
        if (el) {
            el.style.left = nodeData.x + "px";
            el.style.top = nodeData.y + "px";
        }
        renderLines(); // Re-draw lines smoothly while dragging
    }

    function onMouseUp() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        renderMap(); // Snap cleanup
        saveData();
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
}

// Draw Line Helper
function drawLine(startNode, endNode) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    // Center of node approx (width varies around 100px, height 40px)
    // Dynamic size calculation would be better, but fixed offset is stable for now
    let offX = 50;
    let offY = 20;

    line.setAttribute("x1", startNode.x + offX);
    line.setAttribute("y1", startNode.y + offY);
    line.setAttribute("x2", endNode.x + offX);
    line.setAttribute("y2", endNode.y + offY);
    line.setAttribute("stroke", "#999");
    line.setAttribute("stroke-width", "2");

    svgConnections.appendChild(line);
}

// Redraw only lines (for performance during drag)
function renderLines() {
    while (svgConnections.firstChild) {
        svgConnections.removeChild(svgConnections.firstChild);
    }
    nodes.forEach(node => {
        if (node.parentId) {
            const parent = getNodeById(node.parentId);
            if (parent) drawLine(parent, node);
        }
    });
}

// Delete Node
function deleteNode(id) {
    nodes = nodes.filter(n => n.id !== id);
    // Remove parent links from children (orphans)
    nodes.forEach(n => {
        if (n.parentId === id) n.parentId = null;
    });
    if (selectedNodeId === id) selectedNodeId = null;
    renderMap();
    saveData();
}

/* --- STORAGE & EVENTS --- */

function saveData() {
    localStorage.setItem("nodes", JSON.stringify(nodes));
}

// Click Map to Deselect
mapArea.addEventListener("click", (e) => {
    if (e.target === mapArea || e.target === svgConnections) {
        selectedNodeId = null;
        renderMap();
    }
});

// Form Submit
form.addEventListener("submit", (e) => {
    e.preventDefault();
    addNode(nodeInput.value);
});

// Clear
document.getElementById("clearBtn").addEventListener("click", () => {
    if (confirm("Clear all nodes?")) {
        nodes = [];
        renderMap();
        saveData();
    }
});

// Save Button (Manual)
document.getElementById("saveBtn").addEventListener("click", () => {
    saveData();
    alert("Map saved!");
});

// Export
document.getElementById("exportBtn").addEventListener("click", () => {
    let data = JSON.stringify(nodes, null, 2);
    let blob = new Blob([data], { type: "application/json" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mindmap.json";
    a.click();
});

// Contact Form (Demo)
document.getElementById("contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Message Sent! We will contact you shortly.");
    e.target.reset();
});
