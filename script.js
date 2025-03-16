document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const imageUpload = document.getElementById('imageUpload');
    const imagePrompt = document.getElementById('imagePrompt');
    const generateBtn = document.getElementById('generateBtn');
    const imagePreview = document.getElementById('imagePreview');
    const svgPreview = document.getElementById('svgPreview');
    const convertBtn = document.getElementById('convertBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const detailLevel = document.getElementById('detailLevel');
    const detailValue = document.getElementById('detailValue');
    const colorCount = document.getElementById('colorCount');
    const colorValue = document.getElementById('colorValue');
    const simplifyLevel = document.getElementById('simplifyLevel');
    const simplifyValue = document.getElementById('simplifyValue');
    const presetButtons = document.querySelectorAll('.preset-btn');
    const loading = document.getElementById('loading');

    // Variables to store data
    let currentImage = null;
    let currentSvg = null;
    
    // Default settings
    const presets = {
        cartoon: { detail: 5, colors: 8, simplify: 3 },
        minimal: { detail: 2, colors: 3, simplify: 7 },
        detailed: { detail: 8, colors: 15, simplify: 1 },
        custom: { detail: 5, colors: 8, simplify: 3 }
    };

    // Event listeners
    imageUpload.addEventListener('change', handleImageUpload);
    generateBtn.addEventListener('click', handleImageGeneration);
    convertBtn.addEventListener('click', convertToSvg);
    downloadBtn.addEventListener('click', downloadSvg);
    detailLevel.addEventListener('input', updateDetailValue);
    colorCount.addEventListener('input', updateColorValue);
    simplifyLevel.addEventListener('input', updateSimplifyValue);
    
    // Set preset buttons
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            applyPreset(preset);
            
            // Update active button
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Apply initial preset
    applyPreset('cartoon');
    document.querySelector('[data-preset="cartoon"]').classList.add('active');

    // Apply preset settings
    function applyPreset(preset) {
        const settings = presets[preset];
        detailLevel.value = settings.detail;
        colorCount.value = settings.colors;
        simplifyLevel.value = settings.simplify;
        
        updateDetailValue();
        updateColorValue();
        updateSimplifyValue();
    }

    // Update slider values
    function updateDetailValue() {
        detailValue.textContent = detailLevel.value;
        const activePreset = document.querySelector('.preset-btn.active');
        // Check if there is an active preset button before accessing its dataset
        if (activePreset && activePreset.dataset.preset !== 'custom') {
            presetButtons.forEach(b => b.classList.remove('active'));
            document.querySelector('[data-preset="custom"]').classList.add('active');
        }
    }

    function updateColorValue() {
        colorValue.textContent = colorCount.value;
        const activePreset = document.querySelector('.preset-btn.active');
        // Check if there is an active preset button before accessing its dataset
        if (activePreset && activePreset.dataset.preset !== 'custom') {
            presetButtons.forEach(b => b.classList.remove('active'));
            document.querySelector('[data-preset="custom"]').classList.add('active');
        }
    }
    
    function updateSimplifyValue() {
        simplifyValue.textContent = simplifyLevel.value;
        const activePreset = document.querySelector('.preset-btn.active');
        // Check if there is an active preset button before accessing its dataset
        if (activePreset && activePreset.dataset.preset !== 'custom') {
            presetButtons.forEach(b => b.classList.remove('active'));
            document.querySelector('[data-preset="custom"]').classList.add('active');
        }
    }

    // Handle image upload
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (file && file.type.match('image.*')) {
            const reader = new FileReader();
            
            reader.onload = function(event) {
                displayImage(event.target.result);
            };
            
            reader.readAsDataURL(file);
        }
    }

    // Handle AI-generated image
    async function handleImageGeneration() {
        const prompt = imagePrompt.value.trim();
        if (!prompt) {
            alert('Please enter an image description');
            return;
        }
        
        try {
            showLoading(true);
            
            const result = await websim.imageGen({
                prompt: prompt,
                aspect_ratio: "1:1",
            });
            
            displayImage(result.url);
        } catch (error) {
            console.error('Error generating image:', error);
            alert('Failed to generate image. Please try again.');
        } finally {
            showLoading(false);
        }
    }

    // Display image in preview
    function displayImage(src) {
        currentImage = src;
        imagePreview.innerHTML = '';
        
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Uploaded image';
        imagePreview.appendChild(img);
        
        // Enable convert button
        convertBtn.disabled = false;
        
        // Reset SVG preview
        svgPreview.innerHTML = '<p>SVG will appear here</p>';
        downloadBtn.disabled = true;
        currentSvg = null;
    }

    // Convert image to SVG
    async function convertToSvg() {
        if (!currentImage) {
            alert('Please upload or generate an image first');
            return;
        }
        
        try {
            showLoading(true);
            
            // Create a canvas to process the image
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas dimensions
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Draw image on canvas
                ctx.drawImage(img, 0, 0);
                
                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Quantize colors based on color count
                const colors = quantizeColors(imageData, parseInt(colorCount.value));
                
                // Create SVG from the processed image
                const detail = parseInt(detailLevel.value);
                const simplify = parseInt(simplifyLevel.value);
                processSvg(imageData, colors, detail, simplify);
            };
            
            img.onerror = function() {
                showLoading(false);
                alert('Error loading image. Try a different one.');
            };
            
            // Use CORS proxy for generated images (URLs that don't start with data:)
            if (currentImage.startsWith('http')) {
                const corsProxies = [
                    'https://corsproxy.io/?',
                    'https://proxy.cors.sh/',
                    'https://cors-proxy.htmldriven.com/?url=',
                    'https://thingproxy.freeboard.io/fetch/',
                    'https://api.allorigins.win/raw?url=',
                    'https://api.codetabs.com/v1/proxy?quest=',
                    'https://cors-anywhere.herokuapp.com/',
                    'https://crossorigin.me/',
                    'https://cors.x2u.in/',
                    'https://thebugging.com/'
                ];
                
                loadImageWithFallbacks(img, currentImage, corsProxies, 0);
            } else {
                img.src = currentImage;
            }
            
        } catch (error) {
            console.error('Error converting to SVG:', error);
            alert('Failed to convert image. Please try again.');
            showLoading(false);
        }
    }

    // Function to attempt loading image with multiple proxy fallbacks
    function loadImageWithFallbacks(imgElement, originalUrl, proxies, index) {
        if (index >= proxies.length) {
            showLoading(false);
            alert('Error loading image. Unable to access through any proxy. Try a different image.');
            return;
        }
        
        const proxyUrl = proxies[index] + encodeURIComponent(originalUrl);
        console.log(`Trying proxy: ${proxies[index]} (${index + 1}/${proxies.length})`);
        
        imgElement.onerror = function() {
            console.log(`Proxy ${proxies[index]} failed, trying next one...`);
            loadImageWithFallbacks(imgElement, originalUrl, proxies, index + 1);
        };
        
        imgElement.src = proxyUrl;
    }

    // Process SVG using image data
    function processSvg(imageData, colors, detailLevel, simplifyLevel) {
        try {
            // Create SVG paths for each color
            const width = imageData.width;
            const height = imageData.height;
            
            // Create SVG element
            const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgElement.setAttribute('width', width);
            svgElement.setAttribute('height', height);
            svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
            svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            
            // Background rectangle
            const bgColor = colors[0]; // Use most dominant color as background
            const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bgRect.setAttribute('width', width);
            bgRect.setAttribute('height', height);
            bgRect.setAttribute('fill', bgColor);
            svgElement.appendChild(bgRect);
            
            // Add each color layer as paths (skip background color)
            for (let i = 1; i < colors.length; i++) {
                const color = colors[i];
                
                // Extract pixels matching this color
                const threshold = 30 - (detailLevel * 3); // Higher detail = lower threshold
                const colorData = extractColorLayer(imageData, color, threshold);
                
                // Create paths for this color
                const paths = generatePaths(colorData, width, height, simplifyLevel);
                
                // Add paths to SVG
                for (const path of paths) {
                    if (path.length < 10) continue; // Skip very small paths
                    
                    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    pathElement.setAttribute('d', path);
                    pathElement.setAttribute('fill', color);
                    pathElement.setAttribute('stroke', 'none');
                    svgElement.appendChild(pathElement);
                }
            }
            
            // Display SVG
            svgPreview.innerHTML = '';
            svgPreview.appendChild(svgElement);
            
            // Convert to string for download
            const serializer = new XMLSerializer();
            currentSvg = '<?xml version="1.0" standalone="no"?>\n' + 
                serializer.serializeToString(svgElement);
            
            downloadBtn.disabled = false;
            showLoading(false);
            
        } catch (error) {
            console.error('Error processing SVG:', error);
            alert('Failed to process SVG. Please try again with different settings.');
            showLoading(false);
        }
    }

    // Extract a specific color layer from the image
    function extractColorLayer(imageData, targetColor, threshold) {
        const { data, width, height } = imageData;
        const result = new Uint8ClampedArray(width * height);
        
        // Parse target color
        const rgbMatch = targetColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        const target = rgbMatch 
            ? [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])]
            : hexToRgb(targetColor);
        
        // Mark pixels that match the target color
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Calculate color distance
                const distance = Math.sqrt(
                    Math.pow(r - target[0], 2) + 
                    Math.pow(g - target[1], 2) + 
                    Math.pow(b - target[2], 2)
                );
                
                // Mark pixel if within threshold
                result[y * width + x] = distance < threshold ? 1 : 0;
            }
        }
        
        return { data: result, width, height };
    }

    // Generate SVG paths for a color layer
    function generatePaths(colorData, width, height, simplifyLevel) {
        const { data } = colorData;
        const paths = [];
        const visited = new Array(width * height).fill(false);
        
        // Directions for neighbor checks (right, down, left, up)
        const dx = [1, 0, -1, 0];
        const dy = [0, 1, 0, -1];
        
        // Find blobs using BFS and trace their contours
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                
                if (data[idx] === 1 && !visited[idx]) {
                    // Start of a new blob
                    const points = [];
                    const queue = [{x, y}];
                    visited[idx] = true;
                    
                    // BFS to find all connected pixels
                    while (queue.length > 0) {
                        const current = queue.shift();
                        const cx = current.x;
                        const cy = current.y;
                        
                        // Check if this is a boundary pixel
                        let isBoundary = false;
                        for (let d = 0; d < 4; d++) {
                            const nx = cx + dx[d];
                            const ny = cy + dy[d];
                            
                            if (nx < 0 || nx >= width || ny < 0 || ny >= height || data[ny * width + nx] === 0) {
                                isBoundary = true;
                            } else if (!visited[ny * width + nx]) {
                                queue.push({x: nx, y: ny});
                                visited[ny * width + nx] = true;
                            }
                        }
                        
                        if (isBoundary) {
                            points.push({x: cx, y: cy});
                        }
                    }
                    
                    // Skip if too few points
                    if (points.length < 3) continue;
                    
                    // Simplify the path based on simplify level
                    const simplified = simplifyPoints(points, simplifyLevel);
                    
                    // Create SVG path from the points
                    if (simplified.length > 2) {
                        let path = `M${simplified[0].x},${simplified[0].y}`;
                        for (let i = 1; i < simplified.length; i++) {
                            path += ` L${simplified[i].x},${simplified[i].y}`;
                        }
                        path += 'Z';
                        paths.push(path);
                    }
                }
            }
        }
        
        return paths;
    }
    
    // Simplify points using Ramer-Douglas-Peucker algorithm
    function simplifyPoints(points, simplifyLevel) {
        if (points.length <= 2) return points;
        
        // Higher simplify level means more aggressive simplification
        const epsilon = 0.5 + (simplifyLevel * 0.5);
        
        // Find point with maximum distance
        let maxDistance = 0;
        let index = 0;
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];
        
        for (let i = 1; i < points.length - 1; i++) {
            const distance = perpendicularDistance(points[i], firstPoint, lastPoint);
            if (distance > maxDistance) {
                maxDistance = distance;
                index = i;
            }
        }
        
        // Recursively simplify
        if (maxDistance > epsilon) {
            const firstHalf = simplifyPoints(points.slice(0, index + 1), simplifyLevel);
            const secondHalf = simplifyPoints(points.slice(index), simplifyLevel);
            
            // Concatenate the two simplified parts
            return firstHalf.slice(0, -1).concat(secondHalf);
        } else {
            return [firstPoint, lastPoint];
        }
    }
    
    // Calculate perpendicular distance from a point to a line
    function perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        
        // If the line is just a point, return distance between points
        const lineLengthSquared = dx * dx + dy * dy;
        if (lineLengthSquared === 0) {
            const pointDx = point.x - lineStart.x;
            const pointDy = point.y - lineStart.y;
            return Math.sqrt(pointDx * pointDx + pointDy * pointDy);
        }
        
        // Calculate projection and distance
        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lineLengthSquared;
        if (t < 0) {
            // Point is beyond lineStart
            const pointDx = point.x - lineStart.x;
            const pointDy = point.y - lineStart.y;
            return Math.sqrt(pointDx * pointDx + pointDy * pointDy);
        }
        if (t > 1) {
            // Point is beyond lineEnd
            const pointDx = point.x - lineEnd.x;
            const pointDy = point.y - lineEnd.y;
            return Math.sqrt(pointDx * pointDx + pointDy * pointDy);
        }
        
        // Perpendicular distance
        const projX = lineStart.x + t * dx;
        const projY = lineStart.y + t * dy;
        const pointDx = point.x - projX;
        const pointDy = point.y - projY;
        return Math.sqrt(pointDx * pointDx + pointDy * pointDy);
    }

    // Quantize image colors
    function quantizeColors(imageData, colorCount) {
        const { data, width, height } = imageData;
        const pixelCount = width * height;
        const pixels = [];
        
        // Extract colors
        for (let i = 0; i < pixelCount; i++) {
            const offset = i * 4;
            pixels.push([data[offset], data[offset + 1], data[offset + 2]]);
        }
        
        // Simple k-means clustering
        // Start with random centroids
        let centroids = [];
        for (let i = 0; i < colorCount; i++) {
            const randomIndex = Math.floor(Math.random() * pixelCount);
            centroids.push([...pixels[randomIndex]]);
        }
        
        // Run k-means for a few iterations
        const MAX_ITERATIONS = 10;
        for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
            // Assign each pixel to nearest centroid
            const clusters = Array(colorCount).fill().map(() => []);
            
            for (let i = 0; i < pixelCount; i++) {
                const pixel = pixels[i];
                let minDistance = Infinity;
                let closestCentroid = 0;
                
                for (let j = 0; j < colorCount; j++) {
                    const centroid = centroids[j];
                    const distance = Math.sqrt(
                        Math.pow(pixel[0] - centroid[0], 2) + 
                        Math.pow(pixel[1] - centroid[1], 2) + 
                        Math.pow(pixel[2] - centroid[2], 2)
                    );
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestCentroid = j;
                    }
                }
                
                clusters[closestCentroid].push(pixel);
            }
            
            // Update centroids
            for (let j = 0; j < colorCount; j++) {
                const cluster = clusters[j];
                if (cluster.length === 0) continue;
                
                const newCentroid = [0, 0, 0];
                for (const pixel of cluster) {
                    newCentroid[0] += pixel[0];
                    newCentroid[1] += pixel[1];
                    newCentroid[2] += pixel[2];
                }
                
                newCentroid[0] = Math.round(newCentroid[0] / cluster.length);
                newCentroid[1] = Math.round(newCentroid[1] / cluster.length);
                newCentroid[2] = Math.round(newCentroid[2] / cluster.length);
                
                centroids[j] = newCentroid;
            }
        }
        
        // Convert centroids to hex colors
        return centroids.map(c => `rgb(${c[0]}, ${c[1]}, ${c[2]})`);
    }

    // Download SVG
    function downloadSvg() {
        if (!currentSvg) {
            alert('No SVG to download');
            return;
        }
        
        const blob = new Blob([currentSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'converted.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Helper functions
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0];
    }

    function showLoading(show) {
        loading.style.display = show ? 'flex' : 'none';
    }
});