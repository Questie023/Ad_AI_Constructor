<script>
    import { onMount } from 'svelte';

    // State variables
    let imageUrls = Array(3).fill(''); // Reduced to 3
    let uploadedFiles = Array(3).fill(null); // Reduced to 3
    let generatedImagePrompts = Array(3).fill(''); // Reduced to 3
    let logicDescription = '';
    let generatedAdHtml = "<p style='font-family: Inter, sans-serif; text-align: center; color: #6b7280;'>Тут буде відображатись ваша реклама</p>";
    let message = '';
    let showMessageBox = false;
    let imageSourceType = 'link'; // 'link', 'upload', 'generate'

    // Function to handle changes in image URL input fields
    function handleImageUrlChange(index, event) {
        imageUrls[index] = event.target.value;
        imageUrls = imageUrls; // Trigger reactivity in Svelte
    }

    // Function to handle file input changes
    async function handleFileUpload(index, event) {
        const file = event.target.files[0];
        if (file) {
            uploadedFiles[index] = file;
            uploadedFiles = uploadedFiles; // Trigger reactivity
            // Optionally, you could preview the image here if needed
        } else {
            uploadedFiles[index] = null;
            uploadedFiles = uploadedFiles;
        }
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

    // Function to handle the ad generation process
    async function generateAd() {
        let mediaData = []; // This will hold URLs, Base64 strings, or generation prompts

        // --- DEBUGGING LOGS ---
        console.log('--- generateAd function called ---');
        console.log('imageSourceType:', imageSourceType);
        console.log('Current imageUrls:', imageUrls);
        console.log('Current uploadedFiles:', uploadedFiles);
        console.log('Current generatedImagePrompts:', generatedImagePrompts);
        console.log('Current logicDescription:', logicDescription);
        // --- END DEBUGGING LOGS ---


        if (imageSourceType === 'link') {
            const activeImageUrls = imageUrls.filter(url => url.trim() !== '');
            console.log('Active Image URLs (link):', activeImageUrls); // Debug log
            if (activeImageUrls.length === 0) {
                showMessage('Будь ласка, надайте хоча б одне посилання на зображення.');
                return;
            }
            mediaData = activeImageUrls;
        } else if (imageSourceType === 'upload') {
            const activeFiles = uploadedFiles.filter(file => file !== null);
            console.log('Active Uploaded Files:', activeFiles); // Debug log
            if (activeFiles.length === 0) {
                showMessage('Будь ласка, завантажте хоча б одне зображення.');
                return;
            }
            // Convert files to Base64 strings for sending to backend
            try {
                for (const file of activeFiles) {
                    const base64 = await fileToBase64(file);
                    mediaData.push(base64);
                }
            } catch (error) {
                showMessage('Помилка під час перетворення зображень: ' + error.message);
                console.error('Error converting files to Base64:', error);
                return;
            }
        } else if (imageSourceType === 'generate') {
            const activePrompts = generatedImagePrompts.filter(prompt => prompt.trim() !== '');
            console.log('Active Generation Prompts:', activePrompts); // Debug log
            if (activePrompts.length === 0) {
                showMessage('Будь ласка, надайте хоча б один опис для генерації зображення.');
                return;
            }
            mediaData = activePrompts;
        }

        // Frontend validation for max 3 items
        if (mediaData.length > 3) {
            showMessage('Дозволено максимум 3 медіа-елементи (посилання, завантаження або промпти для генерації).');
            return;
        }

        console.log('Final mediaData for backend:', mediaData); // Debug log

        if (!logicDescription.trim()) {
            showMessage('Будь ласка, надайте опис логіки реклами.');
            return;
        }

        // Set loading indicator in the iframe
        generatedAdHtml = "<p style='font-family: Inter, sans-serif; text-align: center; color: #6b7280;'>Генерується реклама... Будь ласка, зачекайте.</p>";

        try {
            // Make API call to the backend
            const response = await fetch('http://localhost:3000/generate', { // Ensure this matches your backend URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageSourceType: imageSourceType, // Send the type to the backend
                    mediaData: mediaData,             // Send the actual media data (URLs, Base64, or prompts)
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
            // This regex matches ` ```html at the beginning and ` ``` at the end, optionally with newlines
            htmlContent = htmlContent.replace(/^```html\s*\n?|\n?```$/g, '').trim();

            generatedAdHtml = htmlContent; // Update the iframe content
        } catch (error) {
            generatedAdHtml = `<p style='font-family: Inter, sans-serif; text-align: center; color: #ef4444;'>Помилка під час генерації реклами: ${error.message}</p>`;
            console.error('Error generating ad:', error);
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
            >
                Створити рекламу
            </button>
        </div>

        <!-- Output Section (Ad Preview) -->
        <!-- Removed min-h-[400px] to allow height to adapt to content -->
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
