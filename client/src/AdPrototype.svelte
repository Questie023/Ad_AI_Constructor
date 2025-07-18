<script>
    import { onMount } from 'svelte';

    // State variables
    let imageUrls = Array(3).fill(''); // For 'link' source type
    let uploadedFiles = Array(3).fill(null); // To store File objects for 'upload' source type
    let localBase64Images = Array(3).fill(''); // To store Base64 strings of uploaded/generated images locally
    let generatedImagePrompts = Array(3).fill(''); // For 'generate' source type
    let logicDescription = '';
    let generatedAdHtml = "<p style='font-family: Inter, sans-serif; text-align: center; color: #6b7280;'>Тут буде відображатись ваша реклама</p>";
    let message = '';
    let showMessageBox = false;
    let imageSourceType = 'link'; // 'link', 'upload', 'generate'
    let isGeneratingImages = false; // New state for image generation loading
    let isLoadingAd = false; // New state for overall ad generation loading

    // Function to handle changes in image URL input fields
    function handleImageUrlChange(index, event) {
        imageUrls[index] = event.target.value;
        imageUrls = imageUrls; // Trigger reactivity in Svelte
    }

    // Function to handle file input changes for 'upload'
    async function handleFileUpload(index, event) {
        const file = event.target.files[0];
        if (file) {
            uploadedFiles[index] = file;
            try {
                // Convert file to Base64 and store locally
                localBase64Images[index] = await fileToBase64(file);
            } catch (error) {
                console.error('Error converting file to Base64:', error);
                showMessage('Помилка завантаження файлу: ' + error.message);
                uploadedFiles[index] = null;
                localBase64Images[index] = '';
            }
        } else {
            uploadedFiles[index] = null;
            localBase64Images[index] = '';
        }
        uploadedFiles = uploadedFiles; // Trigger reactivity
        localBase64Images = localBase64Images; // Trigger reactivity
    }

    // Function to handle generated image prompt changes
    function handleGeneratedImagePromptChange(index, event) {
        generatedImagePrompts[index] = event.target.value;
        generatedImagePrompts = generatedImagePrompts; // Trigger reactivity
    }

    // Function to show a custom message box
    function showMessage(msg) {
        message = msg;
        showMessageBox = true;
    }

    // Function to close the custom message box
    function closeMessageBox() {
        showMessageBox = false;
        message = '';
    }

    // Function to convert File to Base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Function to inject local Base64 images into the generated HTML
    async function injectLocalImagesIntoHtml(htmlString, imageBase64Array) {
        console.log('DEBUG: injectLocalImagesIntoHtml called.');
        console.log('DEBUG: Initial HTML string received:', htmlString.substring(0, 500) + '...'); // Log a snippet
        console.log('DEBUG: imageBase64Array:', imageBase64Array.map(img => img ? img.substring(0, 50) + '...' : 'empty')); // Log snippets of Base64

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        let imagesInjectedCount = 0;
        for (let i = 0; i < imageBase64Array.length; i++) {
            if (imageBase64Array[i]) {
                const imgElement = doc.getElementById(`ad-image-${i}`);
                if (imgElement) {
                    imgElement.src = imageBase64Array[i];
                    console.log(`DEBUG: Injected local image into #ad-image-${i}`);
                    imagesInjectedCount++;
                } else {
                    console.warn(`WARN: Placeholder image element #ad-image-${i} not found in generated HTML.`);
                }
            } else {
                console.log(`DEBUG: No Base64 image found for index ${i}.`);
            }
        }
        console.log(`DEBUG: Total images attempted to inject: ${imageBase64Array.length}`);
        console.log(`DEBUG: Total images successfully injected: ${imagesInjectedCount}`);
        return doc.documentElement.outerHTML; // Return the modified HTML string
    }


    // Function to handle the ad generation process
    async function generateAd() {
        isLoadingAd = true; // Start overall loading
        let mediaDataForBackend = []; // This will hold URLs or metadata for the backend
        localBase64Images = Array(3).fill(''); // Clear previous local images

        // --- DEBUGGING LOGS ---
        console.log('--- generateAd function called ---');
        console.log('imageSourceType:', imageSourceType);
        console.log('Current imageUrls:', imageUrls);
        console.log('Current uploadedFiles:', uploadedFiles);
        console.log('Current localBase64Images (before processing):', localBase64Images); // New log for local Base64
        console.log('Current generatedImagePrompts:', generatedImagePrompts);
        console.log('Current logicDescription:', logicDescription);
        // --- END DEBUGGING LOGS ---


        if (imageSourceType === 'link') {
            const activeImageUrls = imageUrls.filter(url => url.trim() !== '');
            console.log('Active Image URLs (link):', activeImageUrls); // Debug log
            if (activeImageUrls.length === 0) {
                showMessage('Будь ласка, надайте хоча б одне посилання на зображення.');
                isLoadingAd = false;
                return;
            }
            mediaDataForBackend = activeImageUrls; // Send URLs directly
        } else if (imageSourceType === 'upload') {
            const activeFiles = uploadedFiles.filter(file => file !== null);
            console.log('Active Uploaded Files (for metadata):', activeFiles); // Debug log
            if (activeFiles.length === 0) {
                showMessage('Будь ласка, завантажте хоча б одне зображення.');
                isLoadingAd = false;
                return;
            }

            // Await all file conversions before proceeding
            const conversionPromises = activeFiles.map(file => fileToBase64(file));
            try {
                const convertedImages = await Promise.all(conversionPromises);
                localBase64Images = convertedImages; // Store all converted Base64 images
                localBase64Images = localBase64Images; // Trigger reactivity
                console.log('DEBUG: All uploaded files converted to Base64:', localBase64Images.map(img => img ? img.substring(0, 50) + '...' : 'empty'));
            } catch (error) {
                showMessage('Помилка під час перетворення завантажених зображень: ' + error.message);
                console.error('Error converting uploaded files to Base64:', error);
                isLoadingAd = false;
                return;
            }

            // For 'upload', send only metadata (e.g., index, type) to the backend
            mediaDataForBackend = activeFiles.map((file, idx) => ({
                index: idx,
                type: file.type,
            }));
        } else if (imageSourceType === 'generate') {
            const activePrompts = generatedImagePrompts.filter(prompt => prompt.trim() !== '');
            if (activePrompts.length === 0) {
                showMessage('Будь ласка, надайте хоча б один опис для генерації зображення.');
                isLoadingAd = false;
                return;
            }

            isGeneratingImages = true; // Set loading state for image generation
            generatedAdHtml = "<p style='font-family: Inter, sans-serif; text-align: center; color: #6b7280;'>Генеруємо зображення... Будь ласка, зачекайте.</p>";

            // Generate images one by one
            const generatedImagePromises = [];
            for (let i = 0; i < activePrompts.length; i++) {
                const prompt = activePrompts[i];
                generatedImagePromises.push(
                    fetch('http://localhost:3000/image-generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: prompt })
                    })
                    .then(response => {
                        if (!response.ok) {
                            return response.json().then(errorData => {
                                throw new Error(errorData.error || 'Помилка генерації зображення.');
                            });
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log(`Generated image ${i + 1}:`, data.imageUrl.substring(0, 50) + '...');
                        return data.imageUrl;
                    })
                    .catch(error => {
                        console.error(`Error generating image for prompt "${prompt}":`, error);
                        showMessage(`Помилка генерації зображення ${i + 1}: ${error.message}`);
                        return `https://placehold.co/600x400/cccccc/333333?text=Image+Gen+Failed`; // Placeholder on error
                    })
                );
            }

            try {
                const generatedResults = await Promise.all(generatedImagePromises);
                localBase64Images = generatedResults; // Store all generated Base64 images
                localBase64Images = localBase64Images; // Trigger reactivity
                console.log('DEBUG: All generated images stored in localBase64Images:', localBase64Images.map(img => img ? img.substring(0, 50) + '...' : 'empty'));
            } catch (error) {
                showMessage('Помилка під час генерації зображень: ' + error.message);
                console.error('Error during batch image generation:', error);
                isLoadingAd = false;
                isGeneratingImages = false;
                return;
            }

            isGeneratingImages = false; // Reset loading state

            // After generating all images, send metadata (prompts) to the backend for HTML generation
            mediaDataForBackend = activePrompts.map((prompt, idx) => ({
                index: idx,
                prompt: prompt,
                type: 'generated' // Indicate it's a generated image
            }));
        }

        // Frontend validation for max 3 items
        if (mediaDataForBackend.length === 0) { // Ensure at least one media item is provided
             showMessage('Будь ласка, надайте хоча б один медіа-елемент.');
             isLoadingAd = false;
             return;
        }
        if (mediaDataForBackend.length > 3) {
            showMessage('Дозволено максимум 3 медіа-елементи (посилання, завантаження або промпти для генерації).');
            isLoadingAd = false;
            return;
        }

        console.log('Final mediaDataForBackend:', mediaDataForBackend); // Debug log

        if (!logicDescription.trim()) {
            showMessage('Будь ласка, надайте опис логіки реклами.');
            isLoadingAd = false;
            return;
        }

        // Set loading indicator for HTML generation
        generatedAdHtml = "<p style='font-family: Inter, sans-serif; text-align: center; color: #6b7280;'>Генерується HTML-код... Будь ласка, зачекайте.</p>";

        try {
            // Make API call to the backend for HTML generation
            const response = await fetch('http://localhost:3000/generate', { // Ensure this matches your backend URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageSourceType: imageSourceType,
                    mediaData: mediaDataForBackend, // Send metadata or URLs
                    logicDescription: logicDescription
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Помилка мережі або сервера.');
            }

            const data = await response.json();
            let htmlContent = data.html;

            // Remove Markdown code block fences if present
            htmlContent = htmlContent.replace(/^```html\s*\n?|\n?```$/g, '').trim();

            // If source type is 'upload' or 'generate', inject locally stored Base64 images
            if (imageSourceType === 'upload' || imageSourceType === 'generate') {
                generatedAdHtml = await injectLocalImagesIntoHtml(htmlContent, localBase64Images);
            } else {
                generatedAdHtml = htmlContent; // For 'link', use HTML as is
            }

        } catch (error) {
            generatedAdHtml = `<p style='font-family: Inter, sans-serif; text-align: center; color: #ef4444;'>Помилка під час генерації реклами: ${error.message}</p>`;
            console.error('Error generating ad:', error);
        } finally {
            isLoadingAd = false; // End overall loading
        }
    }
</script>

<div class="min-h-screen bg-gray-100 flex justify-center items-start p-5 box-border font-inter">
    <div class="container flex flex-col md:flex-row gap-5 w-full max-w-6xl">
        <!-- Input Section -->
        <div class="input-section flex-1 bg-white rounded-xl p-6 shadow-lg flex flex-col gap-5">
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Створення HTML-реклами</h2>

            <!-- Image Source Type Selector -->
            <div class="flex flex-col gap-2">
                <label class="font-medium text-gray-700">Як отримати фото:</label>
                <div class="flex gap-4">
                    <label class="inline-flex items-center">
                        <input type="radio" class="form-radio text-indigo-600" name="imageSource" value="link" bind:group={imageSourceType}>
                        <span class="ml-2 text-gray-700">Посилання</span>
                    </label>
                    <label class="inline-flex items-center">
                        <input type="radio" class="form-radio text-indigo-600" name="imageSource" value="upload" bind:group={imageSourceType}>
                        <span class="ml-2 text-gray-700">Завантажити з ПК</span>
                    </label>
                    <label class="inline-flex items-center">
                        <input type="radio" class="form-radio text-indigo-600" name="imageSource" value="generate" bind:group={imageSourceType}>
                        <span class="ml-2 text-gray-700">Згенерувати</span>
                    </label>
                </div>
            </div>

            <!-- Conditional Image Inputs -->
            {#if imageSourceType === 'link'}
                {#each Array(3) as _, index} <!-- Loop 3 times -->
                    <div class="flex flex-col gap-2">
                        <label for="imageLink{index + 1}" class="font-medium text-gray-700">
                            Посилання на зображення {index + 1} (URL):
                        </label>
                        <input
                            type="text"
                            id="imageLink{index + 1}"
                            class="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-200"
                            placeholder={`https://example.com/image${index + 1}.jpg ${index > 0 ? "(необов'язково)" : ""}`}
                            bind:value={imageUrls[index]}
                            on:input={(e) => handleImageUrlChange(index, e)}
                        />
                    </div>
                {/each}
            {:else if imageSourceType === 'upload'}
                {#each Array(3) as _, index} <!-- Loop 3 times -->
                    <div class="flex flex-col gap-2">
                        <label for="imageUpload{index + 1}" class="font-medium text-gray-700">
                            Завантажити зображення {index + 1}:
                        </label>
                        <input
                            type="file"
                            id="imageUpload{index + 1}"
                            class="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            accept="image/*"
                            on:change={(e) => handleFileUpload(index, e)}
                        />
                    </div>
                {/each}
            {:else if imageSourceType === 'generate'}
                {#each Array(3) as _, index} <!-- Loop 3 times -->
                    <div class="flex flex-col gap-2">
                        <label for="imageGenerate{index + 1}" class="font-medium text-gray-700">
                            Опис для генерації зображення {index + 1}:
                        </label>
                        <input
                            type="text"
                            id="imageGenerate{index + 1}"
                            class="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-200"
                            placeholder={`Опишіть зображення для генерації ${index + 1}`}
                            bind:value={generatedImagePrompts[index]}
                            on:input={(e) => handleGeneratedImagePromptChange(index, e)}
                        />
                    </div>
                {/each}
            {/if}

            <!-- Logic Description Textarea -->
            <div class="flex flex-col gap-2">
                <label for="logicDescription" class="block text-gray-700 text-sm font-bold mb-1">Опис логіки реклами:</label>
                <textarea
                    id="logicDescription"
                    class="w-full p-3 border border-gray-300 rounded-lg text-base min-h-[120px] resize-y focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-200"
                    placeholder="Опишіть, як має поводитись реклама. Наприклад: 'Зробити вертикальне слайд-шоу як тік-ток, що можна листати вверх-вниз.'"
                    bind:value={logicDescription}
                ></textarea>
            </div>

            <!-- Generate Ad Button -->
            <button
                on:click={generateAd}
                class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-6 rounded-lg text-lg font-semibold cursor-pointer border-none shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 ease-in-out"
                disabled={isGeneratingImages || isLoadingAd}
            >
                {#if isGeneratingImages}
                    Генеруємо зображення...
                {:else if isLoadingAd}
                    Генеруємо рекламу...
                {:else}
                    Створити рекламу
                {/if}
            </button>
        </div>

        <!-- Output Section (Ad Preview) -->
        <div class="output-section flex-1 bg-white rounded-xl p-6 shadow-lg flex flex-col items-center justify-center border border-gray-200">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Вивід готової реклами</h2>
            <iframe
                id="adPreview"
                srcdoc={generatedAdHtml}
                class="w-full h-full border-none rounded-lg bg-gray-50"
                title="Ad Preview"
            ></iframe>
        </div>
    </div>

    <!-- Custom Message Box -->
    {#if showMessageBox}
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center gap-4 max-w-sm text-center">
                <p class="text-gray-800 text-lg font-medium">{message}</p>
                <button
                    on:click={closeMessageBox}
                    class="bg-indigo-600 text-white py-2 px-5 rounded-md text-base font-medium hover:bg-indigo-700 transition duration-200"
                >
                    Закрити
                </button>
            </div>
        </div>
    {/if}
</div>
