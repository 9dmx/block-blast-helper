class BlockBlastHelper {
    constructor() {
        this.gridSize = 8;
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        this.selectedBlocks = [null, null, null];
        this.score = 0; // Track current score
        this.blockShapes = {
            // Single block
            single: [[1]],
            
            // Horizontal lines
            line2h: [[1, 1]],
            line3h: [[1, 1, 1]],
            line4h: [[1, 1, 1, 1]],
            line5h: [[1, 1, 1, 1, 1]],
            
            // Vertical lines
            line2v: [[1], [1]],
            line3v: [[1], [1], [1]],
            line4v: [[1], [1], [1], [1]],
            line5v: [[1], [1], [1], [1], [1]],
            
            // Squares
            square2: [[1, 1], [1, 1]],
            square3: [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
            
            // Small L shapes (all orientations)
            L1: [[1, 0], [1, 1]],
            L2: [[1, 1], [1, 0]],
            L3: [[1, 1], [0, 1]],
            L4: [[0, 1], [1, 1]],
            
            // Large L shapes (all orientations)
            bigL1: [[1, 0, 0], [1, 0, 0], [1, 1, 1]],
            bigL2: [[1, 1, 1], [1, 0, 0], [1, 0, 0]],
            bigL3: [[1, 1, 1], [0, 0, 1], [0, 0, 1]],
            bigL4: [[0, 0, 1], [0, 0, 1], [1, 1, 1]],
            
            // T shapes (all orientations)
            T1: [[1, 1, 1], [0, 1, 0]],
            T2: [[1, 0], [1, 1], [1, 0]],
            T3: [[0, 1, 0], [1, 1, 1]],
            T4: [[0, 1], [1, 1], [0, 1]],
            
            // Z shapes
            Z1: [[1, 1, 0], [0, 1, 1]],
            Z2: [[0, 1], [1, 1], [1, 0]],
            
            // S shapes (reverse Z)
            S1: [[0, 1, 1], [1, 1, 0]],
            S2: [[1, 0], [1, 1], [0, 1]],
            
            // Plus shape
            plus: [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
            
            // Corner shapes
            corner1: [[1, 1, 1], [1, 0, 0], [1, 0, 0]],
            corner2: [[1, 1, 1], [0, 0, 1], [0, 0, 1]],
            corner3: [[0, 0, 1], [0, 0, 1], [1, 1, 1]],
            corner4: [[1, 0, 0], [1, 0, 0], [1, 1, 1]]
        };
        this.currentBlockSlot = 0;
        this.draggedBlock = null;
        this.draggedBlockIndex = null;
        this.drawingGrid = Array(7).fill().map(() => Array(7).fill(0));
        this.pendingMoves = [];
        this.lastSavedBoard = null;
        this.updateThrottle = null;
        
        this.init();
    }

    init() {
        this.createGrid();
        this.createDrawingGrid();
        this.loadSavedBoard();
        this.attachEventListeners();
        this.updateRestoreButtonState();
        
        // Add some test blocks for easier testing
        this.addTestBlocks();
    }

    addTestBlocks() {
        // Add a few simple blocks for testing
        this.selectedBlocks[0] = { shape: this.blockShapes.single };
        this.selectedBlocks[1] = { shape: this.blockShapes.line2h };
        this.selectedBlocks[2] = { shape: this.blockShapes.square2 };
        
        // Update the display for each block
        for (let i = 0; i < 3; i++) {
            if (this.selectedBlocks[i]) {
                this.updateGameBlockPreview(i, this.selectedBlocks[i].shape);
            }
        }
    }

    createGrid() {
        const gridElement = document.getElementById('gameGrid');
        gridElement.innerHTML = '';
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('click', () => this.toggleCell(row, col));
                gridElement.appendChild(cell);
            }
        }
    }

    toggleCell(row, col) {
        this.grid[row][col] = this.grid[row][col] ? 0 : 1;
        this.updateGridDisplay();
        this.autoSaveBoard();
    }

    updateGridDisplay() {
        // Use requestAnimationFrame for smooth updates
        if (this.updateThrottle) {
            cancelAnimationFrame(this.updateThrottle);
        }
        
        this.updateThrottle = requestAnimationFrame(() => {
            const cells = document.querySelectorAll('.grid-cell');
            cells.forEach(cell => {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                
                cell.classList.remove('filled', 'suggestion');
                
                if (this.grid[row][col]) {
                    cell.classList.add('filled');
                }
            });
        });
    }

    autoSaveBoard() {
        // Save current board state
        const boardState = {
            grid: this.grid.map(row => [...row]),
            selectedBlocks: this.selectedBlocks.map(block => 
                block ? { ...block, shape: block.shape.map(row => [...row]) } : null
            ),
            currentBlockSlot: this.currentBlockSlot,
            timestamp: Date.now()
        };
        
        localStorage.setItem('blockBlastBoard', JSON.stringify(boardState));
        this.updateRestoreButtonState();
    }

    loadSavedBoard() {
        try {
            const saved = localStorage.getItem('blockBlastBoard');
            if (saved) {
                const boardState = JSON.parse(saved);
                this.lastSavedBoard = boardState;
                this.updateRestoreButtonState();
            }
        } catch (error) {
            console.warn('Failed to load saved board:', error);
            localStorage.removeItem('blockBlastBoard');
        }
    }

    restoreBoard() {
        if (!this.lastSavedBoard) {
            this.showMessage('No saved board found!', 'info');
            return;
        }

        try {
            // Restore grid
            this.grid = this.lastSavedBoard.grid.map(row => [...row]);
            
            // Restore selected blocks
            this.selectedBlocks = this.lastSavedBoard.selectedBlocks.map(block => 
                block ? { ...block, shape: block.shape.map(row => [...row]) } : null
            );
            
            this.currentBlockSlot = this.lastSavedBoard.currentBlockSlot || 0;
            
            // Update displays
            this.updateGridDisplay();
            this.updateAllBlockPreviews();
            
            // Show success message
            this.showMessage('Board restored successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to restore board:', error);
            this.showMessage('Failed to restore board. The saved data might be corrupted.', 'info');
        }
    }

    updateAllBlockPreviews() {
        for (let i = 0; i < 3; i++) {
            const blockSlot = document.getElementById(`gameBlock${i + 1}`);
            const preview = document.getElementById(`gamePreview${i + 1}`);
            
            if (this.selectedBlocks[i]) {
                this.updateGameBlockPreview(i, this.selectedBlocks[i].shape);
            } else {
                blockSlot.classList.remove('has-block');
                preview.innerHTML = '';
            }
        }
    }

    updateRestoreButtonState() {
        const restoreBtn = document.getElementById('restoreBoard');
        if (restoreBtn) {
            restoreBtn.disabled = !this.lastSavedBoard;
        }
    }

    showMessage(text, type = 'info') {
        // Create message element
        const message = document.createElement('div');
        message.className = `message message-${type}`;
        message.textContent = text;
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : '#4a90e2'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            opacity: 0;
            transform: translateX(100px);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(message);
        
        // Show message
        requestAnimationFrame(() => {
            message.style.opacity = '1';
            message.style.transform = 'translateX(0)';
        });
        
        // Hide message after 3 seconds
        setTimeout(() => {
            message.style.opacity = '0';
            message.style.transform = 'translateX(100px)';
            setTimeout(() => {
                if (message.parentNode) {
                    document.body.removeChild(message);
                }
            }, 300);
        }, 3000);
    }

    createDrawingGrid() {
        const drawingElement = document.getElementById('drawingGrid');
        drawingElement.innerHTML = '';
        
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                const cell = document.createElement('div');
                cell.className = 'drawing-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('click', () => this.toggleDrawingCell(row, col));
                drawingElement.appendChild(cell);
            }
        }
    }

    toggleDrawingCell(row, col) {
        this.drawingGrid[row][col] = this.drawingGrid[row][col] ? 0 : 1;
        this.updateDrawingDisplay();
    }

    updateDrawingDisplay() {
        const cells = document.querySelectorAll('.drawing-cell');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            cell.classList.remove('filled');
            
            if (this.drawingGrid[row][col]) {
                cell.classList.add('filled');
            }
        });
    }

    clearDrawing() {
        this.drawingGrid = Array(7).fill().map(() => Array(7).fill(0));
        this.updateDrawingDisplay();
        this.showMessage('Drawing cleared!', 'success');
    }

    addCustomBlock() {
        // Check if there's at least one filled cell
        const hasFilledCells = this.drawingGrid.some(row => row.some(cell => cell === 1));
        if (!hasFilledCells) {
            this.showMessage('Please draw a block first!', 'info');
            return;
        }

        // Find the bounding box of the drawn shape
        let minRow = 7, maxRow = -1, minCol = 7, maxCol = -1;
        
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                if (this.drawingGrid[row][col]) {
                    minRow = Math.min(minRow, row);
                    maxRow = Math.max(maxRow, row);
                    minCol = Math.min(minCol, col);
                    maxCol = Math.max(maxCol, col);
                }
            }
        }

        // Extract the shape
        const shape = [];
        for (let row = minRow; row <= maxRow; row++) {
            const shapeRow = [];
            for (let col = minCol; col <= maxCol; col++) {
                shapeRow.push(this.drawingGrid[row][col]);
            }
            shape.push(shapeRow);
        }

        // Add to selected blocks
        if (this.currentBlockSlot < 3) {
            this.selectedBlocks[this.currentBlockSlot] = {
                shape: shape,
                name: 'custom'
            };
            this.updateGameBlockPreview(this.currentBlockSlot, shape);
            this.currentBlockSlot++;
            
            if (this.currentBlockSlot >= 3) {
                this.currentBlockSlot = 0;
            }
            
            // Auto-save when blocks change
            this.autoSaveBoard();
            this.showMessage('Custom block added!', 'success');
        }

        // Clear the drawing
        this.clearDrawing();
    }

    updateGameBlockPreview(slot, shape) {
        const preview = document.getElementById(`gamePreview${slot + 1}`);
        const blockSlot = document.getElementById(`gameBlock${slot + 1}`);
        
        preview.innerHTML = '';
        
        if (!shape) {
            // Clear the block slot
            blockSlot.classList.remove('has-block');
            return;
        }
        
        blockSlot.classList.add('has-block');
        
        const dragBlock = this.createDragBlock(shape);
        preview.appendChild(dragBlock);
        
        // Add touch/click functionality
        this.addDragListeners(preview, slot);
        
        // Add double-click to remove block
        this.addDoubleClickToRemove(blockSlot, slot);
    }

    createDragBlock(shape) {
        const dragBlock = document.createElement('div');
        dragBlock.className = 'drag-block';
        
        // Set up proper grid layout
        const cols = shape[0].length;
        const rows = shape.length;
        dragBlock.style.gridTemplateColumns = `repeat(${cols}, 16px)`;
        dragBlock.style.gridTemplateRows = `repeat(${rows}, 16px)`;
        
        // Create all cells to maintain shape structure
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cell = document.createElement('div');
                if (shape[row][col]) {
                    cell.className = 'drag-cell';
                } else {
                    cell.className = 'drag-cell-empty';
                    cell.style.background = 'transparent';
                    cell.style.border = 'none';
                    cell.style.boxShadow = 'none';
                }
                dragBlock.appendChild(cell);
            }
        }
        
        return dragBlock;
    }

    addDoubleClickToRemove(blockSlot, blockIndex) {
        // Remove any existing listeners
        blockSlot.removeEventListener('dblclick', blockSlot._doubleClickHandler);
        blockSlot.removeEventListener('touchstart', blockSlot._longPressHandler);
        blockSlot.removeEventListener('touchend', blockSlot._longPressEndHandler);
        
        // Create removal function
        const removeBlock = () => {
            if (this.selectedBlocks[blockIndex]) {
                // Add smooth disappear animation
                blockSlot.style.transition = 'all 0.3s ease';
                blockSlot.style.opacity = '0';
                blockSlot.style.transform = 'scale(0.8)';
                
                // Clear the block data
                this.selectedBlocks[blockIndex] = null;
                
                // Reset the block after animation
                setTimeout(() => {
                    blockSlot.classList.remove('has-block');
                    document.getElementById(`gamePreview${blockIndex + 1}`).innerHTML = '';
                    blockSlot.style.opacity = '1';
                    blockSlot.style.transform = 'scale(1)';
                    blockSlot.style.transition = '';
                }, 300);
                
                // Auto-save and show message
                this.autoSaveBoard();
                this.showMessage('Block removed!', 'success');
                
                // Update move suggestions
                setTimeout(() => {
                    this.showBestMoves();
                }, 400);
            }
        };
        
        // Double-click for desktop
        blockSlot._doubleClickHandler = removeBlock;
        blockSlot.addEventListener('dblclick', blockSlot._doubleClickHandler);
        
        // Long-press for mobile
        let longPressTimer = null;
        let longPressActive = false;
        
        blockSlot._longPressHandler = (e) => {
            // Only handle if there's a block
            if (!this.selectedBlocks[blockIndex]) return;
            
            longPressActive = true;
            
            // Visual feedback for long press
            blockSlot.classList.add('long-press-active');
            blockSlot.style.transform = 'scale(0.95)';
            blockSlot.style.transition = 'transform 0.1s ease';
            
            // Start long press timer (800ms)
            longPressTimer = setTimeout(() => {
                if (longPressActive) {
                    // Add vibration if available (mobile)
                    if ('vibrate' in navigator) {
                        navigator.vibrate(50);
                    }
                    
                    // Remove visual feedback before showing confirmation
                    blockSlot.classList.remove('long-press-active');
                    blockSlot.style.transform = '';
                    blockSlot.style.transition = '';
                    
                    // Show confirmation
                    const confirmation = confirm('Delete this block?');
                    if (confirmation) {
                        removeBlock();
                    }
                }
            }, 800);
            
            e.preventDefault();
        };
        
        blockSlot._longPressEndHandler = (e) => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            longPressActive = false;
            
            // Reset visual state
            blockSlot.classList.remove('long-press-active');
            blockSlot.style.transform = '';
            blockSlot.style.transition = '';
        };
        
        // Add touch events for long press
        blockSlot.addEventListener('touchstart', blockSlot._longPressHandler, { passive: false });
        blockSlot.addEventListener('touchend', blockSlot._longPressEndHandler);
        blockSlot.addEventListener('touchcancel', blockSlot._longPressEndHandler);
        blockSlot.addEventListener('touchmove', blockSlot._longPressEndHandler);
    }

    addDragListeners(preview, blockIndex) {
        let isDragging = false;
        let dragElement = null;
        let startTouch = null;
        let hasMoved = false;
        
        // Get coordinates from mouse or touch event
        const getEventCoords = (e) => {
            if (e.touches && e.touches.length > 0) {
                return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
            return { x: e.clientX, y: e.clientY };
        };
        
        const handleStart = (e) => {
            if (!this.selectedBlocks[blockIndex]) return;
            
            const coords = getEventCoords(e);
            startTouch = coords;
            hasMoved = false;
            
            // For touch events, prevent default scrolling
            if (e.type === 'touchstart') {
                e.preventDefault();
                // Disable scrolling on the body
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
                document.body.style.height = '100%';
            }
        };
        
        const handleMove = (e) => {
            if (!startTouch) return;
            
            const coords = getEventCoords(e);
            const deltaX = Math.abs(coords.x - startTouch.x);
            const deltaY = Math.abs(coords.y - startTouch.y);
            
            // If moved more than 10px, start dragging
            if (!isDragging && (deltaX > 10 || deltaY > 10)) {
                isDragging = true;
                hasMoved = true;
                
                this.draggedBlock = this.selectedBlocks[blockIndex];
                this.draggedBlockIndex = blockIndex;
                
                // Create drag element
                dragElement = preview.cloneNode(true);
                dragElement.classList.add('dragging');
                dragElement.style.position = 'fixed';
                dragElement.style.left = coords.x - 40 + 'px';
                dragElement.style.top = coords.y - 40 + 'px';
                dragElement.style.zIndex = '9999';
                dragElement.style.pointerEvents = 'none';
                document.body.appendChild(dragElement);
                
                preview.style.opacity = '0.5';
                document.getElementById(`gameBlock${blockIndex + 1}`).classList.add('dragging');
            }
            
            if (isDragging && dragElement) {
                dragElement.style.left = coords.x - 40 + 'px';
                dragElement.style.top = coords.y - 40 + 'px';
                
                // Check for valid drop zone
                const gridElement = document.getElementById('gameGrid');
                const gridRect = gridElement.getBoundingClientRect();
                
                if (coords.x >= gridRect.left && coords.x <= gridRect.right &&
                    coords.y >= gridRect.top && coords.y <= gridRect.bottom) {
                    
                    const cellSize = gridRect.width / this.gridSize;
                    const col = Math.floor((coords.x - gridRect.left) / cellSize);
                    const row = Math.floor((coords.y - gridRect.top) / cellSize);
                    
                    this.showDropPreview(row, col);
                } else {
                    this.clearDropPreview();
                }
            }
            
            if (e.type === 'touchmove') {
                e.preventDefault();
            }
        };
        
        const handleEnd = (e) => {
            // Re-enable scrolling
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.height = '';
            
            if (isDragging) {
                const coords = getEventCoords(e.type === 'touchend' ? e.changedTouches[0] : e);
                
                // Check if dropped on grid
                const gridElement = document.getElementById('gameGrid');
                const gridRect = gridElement.getBoundingClientRect();
                
                if (coords.x >= gridRect.left && coords.x <= gridRect.right &&
                    coords.y >= gridRect.top && coords.y <= gridRect.bottom) {
                    
                    const cellSize = gridRect.width / this.gridSize;
                    const col = Math.floor((coords.x - gridRect.left) / cellSize);
                    const row = Math.floor((coords.y - gridRect.top) / cellSize);
                    
                    if (this.canPlaceBlock(row, col, this.draggedBlock.shape)) {
                        this.placeBlockFromDrag(row, col, this.draggedBlockIndex);
                    }
                }
                
                // Cleanup
                if (dragElement) {
                    document.body.removeChild(dragElement);
                    dragElement = null;
                }
                
                preview.style.opacity = '1';
                document.getElementById(`gameBlock${this.draggedBlockIndex + 1}`).classList.remove('dragging');
                this.clearDropPreview();
                
                this.draggedBlock = null;
                this.draggedBlockIndex = null;
            }
            
            isDragging = false;
            startTouch = null;
            hasMoved = false;
        };
        
        // Mouse events
        preview.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
        // Touch events with proper mobile handling
        preview.addEventListener('touchstart', handleStart, { passive: false });
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd, { passive: false });
        
        // Prevent context menu
        preview.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    showDropPreview(row, col) {
        this.clearDropPreview();
        
        if (!this.draggedBlock) return;
        
        const isValid = this.canPlaceBlock(row, col, this.draggedBlock.shape);
        
        for (let r = 0; r < this.draggedBlock.shape.length; r++) {
            for (let c = 0; c < this.draggedBlock.shape[r].length; c++) {
                if (this.draggedBlock.shape[r][c]) {
                    const gridRow = row + r;
                    const gridCol = col + c;
                    
                    if (gridRow >= 0 && gridRow < this.gridSize && 
                        gridCol >= 0 && gridCol < this.gridSize) {
                        const cell = document.querySelector(`[data-row="${gridRow}"][data-col="${gridCol}"]`);
                        if (cell) {
                            cell.classList.add(isValid ? 'drop-valid' : 'drop-invalid');
                        }
                    }
                }
            }
        }
    }

    clearDropPreview() {
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('drop-valid', 'drop-invalid');
        });
    }

    placeBlockFromDrag(row, col, blockIndex) {
        const block = this.selectedBlocks[blockIndex];
        
        // Place block on grid
        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[r].length; c++) {
                if (block.shape[r][c]) {
                    this.grid[row + r][col + c] = 1;
                }
            }
        }
        
        // Update score
        this.score += block.shape.flat().filter(cell => cell).length * 10;
        
        // Clear lines and get bonus
        const linesCleared = this.clearLines();
        if (linesCleared > 0) {
            this.score += linesCleared * linesCleared * 100;
        }
        
        // Remove the used block
        this.selectedBlocks[blockIndex] = null;
        this.updateGameBlockPreview(blockIndex, null);
        
        // Update displays
        this.updateGridDisplay();
        this.updateScore();
        this.autoSaveBoard();
    }

    updateScore() {
        // Update score display if it exists
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = this.score;
        }
    }

    updateBlockPreview(slot, shape) {
        const preview = document.getElementById(`preview${slot + 1}`);
        const blockElement = document.getElementById(`block${slot + 1}`);
        
        preview.innerHTML = '';
        blockElement.classList.add('has-block');
        
        const miniGrid = document.createElement('div');
        miniGrid.style.display = 'grid';
        miniGrid.style.gridTemplateColumns = `repeat(${shape[0].length}, 8px)`;
        miniGrid.style.gridTemplateRows = `repeat(${shape.length}, 8px)`;
        miniGrid.style.gap = '1px';
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                const cell = document.createElement('div');
                cell.style.width = '8px';
                cell.style.height = '8px';
                cell.style.borderRadius = '1px';
                
                if (shape[row][col]) {
                    cell.style.background = '#4a90e2';
                } else {
                    cell.style.background = '#555555';
                }
                
                miniGrid.appendChild(cell);
            }
        }
        
        preview.appendChild(miniGrid);
    }

    canPlaceBlock(startRow, startCol, shape) {
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const gridRow = startRow + row;
                    const gridCol = startCol + col;
                    
                    if (gridRow < 0 || gridRow >= this.gridSize || 
                        gridCol < 0 || gridCol >= this.gridSize ||
                        this.grid[gridRow][gridCol]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    simulatePlacement(startRow, startCol, shape) {
        // Create a copy of the grid
        const testGrid = this.grid.map(row => [...row]);
        
        // Place the block
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    testGrid[startRow + row][startCol + col] = 1;
                }
            }
        }
        
        // Count lines that would be cleared
        let linesCleared = 0;
        
        // Check rows
        for (let row = 0; row < this.gridSize; row++) {
            if (testGrid[row].every(cell => cell === 1)) {
                linesCleared++;
            }
        }
        
        // Check columns
        for (let col = 0; col < this.gridSize; col++) {
            let columnFull = true;
            for (let row = 0; row < this.gridSize; row++) {
                if (testGrid[row][col] === 0) {
                    columnFull = false;
                    break;
                }
            }
            if (columnFull) {
                linesCleared++;
            }
        }
        
        // Calculate score
        let blockSize = 0;
        for (let row of shape) {
            for (let cell of row) {
                if (cell) blockSize++;
            }
        }
        
        let score = blockSize * 10 + linesCleared * linesCleared * 100;
        
        return { score, linesCleared };
    }

    findBestMoves() {
        let moves = [];
        
        for (let blockIndex = 0; blockIndex < 3; blockIndex++) {
            const block = this.selectedBlocks[blockIndex];
            if (!block) continue;
            
            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    if (this.canPlaceBlock(row, col, block.shape)) {
                        const result = this.simulatePlacement(row, col, block.shape);
                        
                        moves.push({
                            row,
                            col,
                            shape: block.shape,
                            blockIndex,
                            blockName: block.name,
                            score: result.score,
                            linesCleared: result.linesCleared
                        });
                    }
                }
            }
        }
        
        return moves.sort((a, b) => b.score - a.score);
    }

    showBestMoves() {
        // Clear previous suggestions
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('suggestion');
        });
        
        const moves = this.findBestMoves();
        const container = document.getElementById('movesSuggestions');
        
        if (moves.length === 0) {
            container.innerHTML = '<p class="no-moves">No valid moves available!</p>';
            return;
        }
        
        container.innerHTML = '';
        
        // Show top 5 moves
        moves.slice(0, 5).forEach((move, index) => {
            const moveElement = document.createElement('div');
            moveElement.className = 'move-suggestion';
            
            moveElement.innerHTML = `
                <div class="move-score">+${move.score} points</div>
                <div class="move-details">
                    Block ${move.blockIndex + 1} at row ${move.row + 1}, col ${move.col + 1}
                    ${move.linesCleared > 0 ? `• Clears ${move.linesCleared} line(s)` : ''}
                </div>
                <div class="move-block-preview">
                    <span>Block:</span>
                    ${this.createMiniPreview(move.shape)}
                </div>
            `;
            
            moveElement.addEventListener('click', () => {
                this.selectMove(move, moveElement);
            });
            
            container.appendChild(moveElement);
        });
    }

    createMiniPreview(shape) {
        let gridClass = 'preview-mini';
        
        if (shape.length === 1 && shape[0].length > 1) {
            // Horizontal line
        } else if (shape.length > 1 && shape[0].length === 1) {
            // Vertical line
            gridClass += ' vertical';
        } else if (shape.length === 2 && shape[0].length === 2) {
            gridClass += ' grid2x2';
        } else if (shape.length === 3 && shape[0].length === 3) {
            gridClass += ' grid3x3';
        }
        
        let html = `<div class="${gridClass}">`;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                const cellClass = shape[row][col] ? 'preview-cell filled' : 'preview-cell';
                html += `<div class="${cellClass}"></div>`;
            }
        }
        
        html += '</div>';
        return html;
    }

    selectMove(move, moveElement) {
        // Clear previous selections
        document.querySelectorAll('.move-suggestion').forEach(el => {
            el.classList.remove('active');
        });
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('suggestion');
        });
        
        // Highlight selected move
        moveElement.classList.add('active');
        
        // Show move on grid
        for (let row = 0; row < move.shape.length; row++) {
            for (let col = 0; col < move.shape[row].length; col++) {
                if (move.shape[row][col]) {
                    const gridRow = move.row + row;
                    const gridCol = move.col + col;
                    const cell = document.querySelector(`[data-row="${gridRow}"][data-col="${gridCol}"]`);
                    if (cell) {
                        cell.classList.add('suggestion');
                    }
                }
            }
        }
        
        // Add to pending moves instead of auto-executing
        this.addToPendingMoves(move);
    }

    addToPendingMoves(move) {
        // Remove existing move for this block
        this.pendingMoves = this.pendingMoves.filter(m => m.blockIndex !== move.blockIndex);
        
        // Add new move
        this.pendingMoves.push(move);
    }

    executePendingMoves() {
        if (this.pendingMoves.length === 0) {
            this.showMessage('No moves selected! Click on a suggestion first.', 'info');
            return;
        }

        // Sort moves by score (highest first)
        this.pendingMoves.sort((a, b) => b.score - a.score);

        // Execute each move
        this.pendingMoves.forEach((move, index) => {
            setTimeout(() => {
                this.applyMove(move);
            }, index * 500); // Delay between moves
        });

        // Clear pending moves
        this.pendingMoves = [];
        
        this.showMessage(`Executing ${this.pendingMoves.length} move(s)!`, 'success');
    }

    applyMove(move) {
        // Place the block on the grid
        for (let row = 0; row < move.shape.length; row++) {
            for (let col = 0; col < move.shape[row].length; col++) {
                if (move.shape[row][col]) {
                    this.grid[move.row + row][move.col + col] = 1;
                }
            }
        }
        
        // Clear lines
        this.clearLines();
        
        // Remove the used block with smooth animation
        this.removeUsedBlock(move.blockIndex);
        
        // Update display
        this.updateGridDisplay();
        
        // Clear suggestions
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('suggestion');
        });
        document.querySelectorAll('.move-suggestion').forEach(el => {
            el.classList.remove('active');
        });
        
        // Update moves list
        setTimeout(() => {
            this.showBestMoves();
        }, 500);
    }

    removeUsedBlock(blockIndex) {
        const blockSlot = document.getElementById(`gameBlock${blockIndex + 1}`);
        const preview = document.getElementById(`gamePreview${blockIndex + 1}`);
        
        // Add smooth disappear animation
        blockSlot.style.transition = 'all 0.3s ease';
        blockSlot.style.opacity = '0';
        blockSlot.style.transform = 'scale(0.8)';
        
        // Clear the block data
        this.selectedBlocks[blockIndex] = null;
        
        // Reset the block after animation
        setTimeout(() => {
            blockSlot.classList.remove('has-block');
            preview.innerHTML = '';
            blockSlot.style.opacity = '1';
            blockSlot.style.transform = 'scale(1)';
        }, 300);
    }

    clearLines() {
        let linesCleared = 0;
        
        // Check rows
        for (let row = 0; row < this.gridSize; row++) {
            if (this.grid[row].every(cell => cell === 1)) {
                this.grid[row].fill(0);
                linesCleared++;
            }
        }
        
        // Check columns
        for (let col = 0; col < this.gridSize; col++) {
            let columnFull = true;
            for (let row = 0; row < this.gridSize; row++) {
                if (this.grid[row][col] === 0) {
                    columnFull = false;
                    break;
                }
            }
            if (columnFull) {
                for (let row = 0; row < this.gridSize; row++) {
                    this.grid[row][col] = 0;
                }
                linesCleared++;
            }
        }
        
        return linesCleared;
    }

    clearGrid() {
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        this.updateGridDisplay();
    }

    clearSelectedBlocks() {
        this.selectedBlocks = [null, null, null];
        this.currentBlockSlot = 0;
        
        for (let i = 1; i <= 3; i++) {
            document.getElementById(`gamePreview${i}`).innerHTML = '';
            document.getElementById(`gameBlock${i}`).classList.remove('has-block');
        }
    }

    attachEventListeners() {
        // Clear grid button
        document.getElementById('clearGrid').addEventListener('click', () => {
            this.clearGrid();
        });

        // Restore board button
        document.getElementById('restoreBoard').addEventListener('click', () => {
            this.restoreBoard();
        });

        // Get best move button
        document.getElementById('getBestMove').addEventListener('click', () => {
            this.showBestMoves();
        });

        // Drawing controls
        document.getElementById('clearDrawing').addEventListener('click', () => {
            this.clearDrawing();
        });

        document.getElementById('addCustomBlock').addEventListener('click', () => {
            this.addCustomBlock();
        });

        // Run moves button
        document.getElementById('runMoves').addEventListener('click', () => {
            this.executePendingMoves();
        });

        // Guide button and modal
        this.setupGuideModal();
    }

    setupGuideModal() {
        const guideButton = document.getElementById('guideButton');
        const guideModal = document.getElementById('guideModal');
        const closeModal = document.querySelector('.close-modal');
        const closeGuide = document.getElementById('closeGuide');

        // Show modal when guide button is clicked
        guideButton.addEventListener('click', () => {
            guideModal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        });

        // Close modal when X is clicked
        closeModal.addEventListener('click', () => {
            this.closeGuideModal();
        });

        // Close modal when "Got it!" button is clicked
        closeGuide.addEventListener('click', () => {
            this.closeGuideModal();
        });

        // Close modal when clicking outside of it
        guideModal.addEventListener('click', (e) => {
            if (e.target === guideModal) {
                this.closeGuideModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && guideModal.style.display === 'block') {
                this.closeGuideModal();
            }
        });
    }

    closeGuideModal() {
        const guideModal = document.getElementById('guideModal');
        guideModal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Initialize the helper when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new BlockBlastHelper();
});
