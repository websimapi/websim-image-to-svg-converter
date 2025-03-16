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
    const loading = document.getElementById('loading');

    // Variables to store data
    let currentImage = null;
    let currentSvg = null;

    // Event listeners
    imageUpload.addEventListener('change', handleImageUpload);
    generateBtn.addEventListener('click', handleImageGeneration);
    convertBtn.addEventListener('click', convertToSvg);
    downloadBtn.addEventListener('click', downloadSvg);
    detailLevel.addEventListener('input', updateDetailValue);
    colorCount.addEventListener('input', updateColorValue);

    // Update slider values
    function updateDetailValue() {
        detailValue.textContent = detailLevel.value;
    }

    function updateColorValue() {
        colorValue.textContent = colorCount.value;
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
                processSvg(imageData, colors, detail);
            };
            
            img.onerror = function() {
                showLoading(false);
                alert('Error loading image. Try a different one.');
            };
            
            img.src = currentImage;
            
        } catch (error) {
            console.error('Error converting to SVG:', error);
            alert('Failed to convert image. Please try again.');
            showLoading(false);
        }
    }

    // Process SVG using image data
    function processSvg(imageData, colors, detailLevel) {
        try {
            // Create SVG paths for each color
            const width = imageData.width;
            const height = imageData.height;
            
            // Create SVG element
            const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgElement.setAttribute('width', width);
            svgElement.setAttribute('height', height);
            svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
            
            // Add each color layer as paths
            for (const color of colors) {
                // Extract pixels matching this color
                const threshold = 10 - detailLevel; // Higher detail = lower threshold
                const colorData = extractColorLayer(imageData, color, threshold);
                
                // Create paths for this color
                const paths = generatePaths(colorData, width, height);
                
                // Add paths to SVG
                for (const path of paths) {
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
                result[y * width + x] = distance < threshold * 10 ? 1 : 0;
            }
        }
        
        return { data: result, width, height };
    }

    // Generate SVG paths for a color layer
    function generatePaths(colorData, width, height) {
        // Simple method to create paths
        const { data } = colorData;
        const paths = [];
        
        // Find contiguous regions and create paths
        // Note: This is a simplified approach
        for (let y = 0; y < height; y++) {
            let path = '';
            let isDrawing = false;
            
            for (let x = 0; x < width; x++) {
                const current = data[y * width + x];
                
                if (current && !isDrawing) {
                    // Start new path
                    path = `M${x},${y}`;
                    isDrawing = true;
                } else if (current && isDrawing) {
                    // Continue path
                    path += ` L${x},${y}`;
                } else if (!current && isDrawing) {
                    // End path
                    paths.push(path + ` L${x-1},${y+1} Z`);
                    isDrawing = false;
                }
            }
            
            if (isDrawing) {
                paths.push(path + ` L${width-1},${y+1} Z`);
            }
        }
        
        return paths;
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

