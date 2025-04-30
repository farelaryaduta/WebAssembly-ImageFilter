let wasm;  
        createModule().then(Module => {     
            wasm = Module;     
            console.log("wasm loaded :", wasm); 
        });  

        const upload = document.getElementById("upload"); 
        const filterSelect = document.getElementById("filter"); 
        const applyBtn = document.getElementById("apply"); 
        const canvas = document.getElementById("canvas"); 
        const ctx = canvas.getContext("2d"); 
        let imageData;  

        upload.addEventListener("change", e => {   
            const file = e.target.files[0];   
            const img = new Image();   
            img.onload = () => {
                // Calculate aspect ratio and fit to canvas container
                const containerWidth = 900; // Max width of the container
                const containerHeight = 400; // Height of the canvas container
                
                let newWidth = img.width;
                let newHeight = img.height;
                
                // Calculate the scale factor to fit the image inside the container
                const scale = Math.min(
                    containerWidth / img.width, 
                    containerHeight / img.height
                );
                
                // Set new dimensions
                newWidth = img.width * scale;
                newHeight = img.height * scale;
                
                // Set canvas dimensions to the scaled size
                canvas.width = newWidth;     
                canvas.height = newHeight;     
                
                // Draw image with the new dimensions
                ctx.drawImage(img, 0, 0, newWidth, newHeight);     
                imageData = ctx.getImageData(0, 0, newWidth, newHeight);   
            };   
            img.src = URL.createObjectURL(file); 
        });  

        function jsBlur(data, width, height) {     
            const kernel = [1, 1, 1,                     
                           1, 1, 1,                     
                           1, 1, 1];     
            const kernelSize = 3;     
            const result = new Uint8ClampedArray(data.length);        
            
            for (let y = 1; y < height - 1; y++) {       
                for (let x = 1; x < width - 1; x++) {         
                    for (let c = 0; c < 3; c++) {           
                        let sum = 0;           
                        for (let ky = 0; ky < kernelSize; ky++) {             
                            for (let kx = 0; kx < kernelSize; kx++) {               
                                const px = x + kx - 1;               
                                const py = y + ky - 1;               
                                const idx = (py * width + px) * 4 + c;               
                                sum += data[idx] * kernel[ky * kernelSize + kx];             
                            }           
                        }           
                        const i = (y * width + x) * 4 + c;           
                        result[i] = sum / 9;         
                    }         
                    result[(y * width + x) * 4 + 3] = 255; // alpha       
                }     
            }        
            
            return result;   
        }     

        applyBtn.addEventListener("click", () => {   
            if (!imageData) return;   
            const filter = filterSelect.value;   
            const dataCopy = new Uint8ClampedArray(imageData.data);   
            const t0 = performance.now();    
            
            if (filter === "js-invert") {     
                for (let i = 0; i < dataCopy.length; i += 4) {       
                    dataCopy[i] = 255 - dataCopy[i];       
                    dataCopy[i + 1] = 255 - dataCopy[i + 1];       
                    dataCopy[i + 2] = 255 - dataCopy[i + 2];     
                }     
                const t1 = performance.now();     
                console.log(`JS invert time: ${(t1 - t0).toFixed(2)}ms`);     
                imageData.data.set(dataCopy);     
                ctx.putImageData(imageData, 0, 0);     
                return;   
            }    
            
            if (filter === "js-blur") {     
                const result = jsBlur(dataCopy, canvas.width, canvas.height);     
                const t1 = performance.now();     
                console.log(`JS blur time: ${(t1 - t0).toFixed(2)}ms`);     
                imageData.data.set(result);     
                ctx.putImageData(imageData, 0, 0);     
                return;   
            }       
            
            const len = dataCopy.length;   
            const ptr = wasm._malloc(len);   
            wasm.HEAPU8.set(dataCopy, ptr);    
            
            switch (filter) {     
                case "blur":       
                    wasm._blur(ptr, canvas.width, canvas.height);       
                    break;     
                case "sharpen":       
                    wasm._sharpen(ptr, canvas.width, canvas.height);       
                    break;     
                case "invert":       
                    wasm._invert(ptr, len);       
                    break;   
            }    
            
            const result = wasm.HEAPU8.slice(ptr, ptr + len);   
            wasm._free(ptr);   
            const t1 = performance.now();   
            console.log(`${filter} (WASM) time: ${(t1 - t0).toFixed(2)}ms`);   
            imageData.data.set(result);   
            ctx.putImageData(imageData, 0, 0); 
        });