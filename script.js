document.addEventListener('DOMContentLoaded', () => {
    // === Elements ===
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');

    const uploadSection = document.getElementById('uploadSection');
    const editorSection = document.getElementById('editorSection');

    const originalPreview = document.getElementById('originalPreview');
    const compressedPreview = document.getElementById('compressedPreview');
    const originalMeta = document.getElementById('originalMeta');
    const compressedMeta = document.getElementById('compressedMeta');

    const qualityRange = document.getElementById('qualityRange');
    const qualityVal = document.getElementById('qualityVal');
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    const formatSelect = document.getElementById('formatSelect');

    const resetBtn = document.getElementById('resetBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    const errorContainer = document.getElementById('errorContainer');
    const errorText = document.getElementById('errorText');
    const closeError = document.getElementById('closeError');
    const loader = document.getElementById('loader');

    // === State ===
    let state = {
        file: null,
        img: null,
        blob: null
    };

    // Global Error Handler
    window.onerror = function (msg, source, lineno, colno, error) {
        showError(`System Error: ${msg}`);
        return false;
    };

    // === Event Listeners ===

    // File Input Trigger
    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropZone.addEventListener('click', () => fileInput.click());

    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
        dropZone.classList.remove('dragover');
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Controls
    qualityRange.addEventListener('input', (e) => {
        qualityVal.textContent = `${e.target.value}%`;
        debounceCompress();
    });

    [widthInput, heightInput, formatSelect].forEach(el => {
        el.addEventListener('change', debounceCompress);
    });

    resetBtn.addEventListener('click', resetApp);
    downloadBtn.addEventListener('click', downloadImage);
    closeError.addEventListener('click', hideError);

    // === Logic ===

    function handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0];

        hideError();
        loader.classList.remove('hidden'); // Show loader immediately

        if (!file.type.match('image.*')) {
            loader.classList.add('hidden');
            showError("Please upload a valid image file (JPG, PNG, WebP).");
            return;
        }

        state.file = file;
        originalMeta.textContent = formatBytes(file.size);

        const reader = new FileReader();
        reader.onload = (e) => {
            state.img = new Image();
            state.img.onload = () => {
                // Init inputs
                widthInput.value = state.img.width;
                heightInput.value = state.img.height;

                // Show Editor
                uploadSection.classList.add('hidden');
                editorSection.classList.remove('hidden');

                originalPreview.src = state.img.src;
                compressImage(); // Initial compression
            };
            state.img.onerror = () => {
                loader.classList.add('hidden');
                showError("Failed to load image data.");
            };
            state.img.src = e.target.result;
        };
        reader.onerror = () => {
            loader.classList.add('hidden');
            showError("Error reading file.");
        };
        reader.readAsDataURL(file);
    }

    let searchTimer;
    function debounceCompress() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(compressImage, 100);
    }

    function compressImage() {
        if (!state.img) return;

        loader.classList.remove('hidden');

        // Allow UI to render loader
        requestAnimationFrame(() => {
            setTimeout(() => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Dimensions
                    let w = parseInt(widthInput.value) || state.img.width;
                    let h = parseInt(heightInput.value) || state.img.height;

                    // Maintain Aspect Ratio Logic can be added here if needed, 
                    // but usually handled by user input or pre-calc.
                    // For now, simpler is robust.

                    canvas.width = w;
                    canvas.height = h;

                    ctx.drawImage(state.img, 0, 0, w, h);

                    // Compression
                    let quality = parseInt(qualityRange.value) / 100;
                    let format = formatSelect.value;

                    if (format === 'original') {
                        format = state.file.type;
                    }

                    // Fallback
                    if (!['image/jpeg', 'image/png', 'image/webp'].includes(format)) {
                        format = 'image/jpeg';
                    }

                    const dataUrl = canvas.toDataURL(format, quality);

                    // Update Preview
                    compressedPreview.src = dataUrl;

                    // Update Size
                    // Base64 length approximation
                    const head = `data:${format};base64,`;
                    const sizeBytes = Math.round((dataUrl.length - head.length) * 3 / 4);
                    compressedMeta.textContent = formatBytes(sizeBytes);

                    state.blob = dataUrl;

                } catch (err) {
                    console.error(err);
                    showError("Compression failed: " + err.message);
                } finally {
                    loader.classList.add('hidden');
                }
            }, 50); // Small delay to guarantee loader render
        });
    }

    function downloadImage() {
        if (!state.blob) return;

        const link = document.createElement('a');
        link.href = state.blob;

        // Name generation
        let ext = 'jpg';
        if (state.blob.startsWith('data:image/png')) ext = 'png';
        if (state.blob.startsWith('data:image/webp')) ext = 'webp';

        let originalName = state.file.name.substring(0, state.file.name.lastIndexOf('.')) || state.file.name;
        link.download = `${originalName}_compressed.${ext}`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function resetApp() {
        state = { file: null, img: null, blob: null };
        fileInput.value = '';
        uploadSection.classList.remove('hidden');
        editorSection.classList.add('hidden');
        hideError();
        // Reset controls
        qualityRange.value = 80;
        qualityVal.textContent = '80%';
        formatSelect.value = 'original';
    }

    function showError(msg) {
        errorText.textContent = msg;
        errorContainer.classList.remove('hidden');
    }

    function hideError() {
        errorContainer.classList.add('hidden');
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Visitor Counter Simulation
    const visitorCount = document.getElementById('visitorCount');
    let visits = localStorage.getItem('photoReducer_visits');

    if (!visits) {
        // Random start number between 10k and 15k
        visits = Math.floor(Math.random() * (15000 - 10000 + 1) + 10000);
    } else {
        visits = parseInt(visits) + 1;
    }

    localStorage.setItem('photoReducer_visits', visits);

    function formatCount(n) {
        if (n < 1000) return n;
        if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }

    visitorCount.textContent = formatCount(visits) + ' Visitors';
});
