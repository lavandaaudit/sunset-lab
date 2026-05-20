document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('lab-video-player');
    const playlistContainer = document.getElementById('playlist-container');
    const titleHUD = document.getElementById('current-video-title');
    const dateHUD = document.getElementById('current-video-date');
    const photoGrid = document.getElementById('photo-gallery-grid');
    const photoStats = document.getElementById('photo-stats');
    
    // Modal elements
    const modal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('modal-img');
    const modalCaption = document.getElementById('modal-caption');
    const closeModalBtn = document.querySelector('.modal-close');
    const modalPrev = document.getElementById('modal-prev');
    const modalNext = document.getElementById('modal-next');
    const modalCounter = document.getElementById('modal-counter');

    let videoPlaylist = [];
    let photoPlaylist = [];
    let currentVideoIndex = 0;
    let currentPhotoIndexInModal = 0;

    const MAX_ITEMS = 1000;
    const VIDEO_DIR = 'videos/';
    const PHOTO_DIR = 'photos/';

    async function probeFiles() {
        console.log("Starting media search...");
        
        // 1. Probe Videos
        playlistContainer.innerHTML = '<div class="loading-feed">СКАНУВАННЯ ВІДЕО-АРХІВУ...</div>';
        videoPlaylist = await findSequentialFiles(VIDEO_DIR, ['mp4', 'MP4', 'mov', 'MOV'], 1, MAX_ITEMS);
        
        if (videoPlaylist.length === 0) {
            playlistContainer.innerHTML = '<div class="loading-feed" style="color:var(--neon-red)">ВІДЕО НЕ ЗНАЙДЕНО<br><small>Додайте файли 1.mp4, 2.mp4... у папку videos/</small></div>';
        } else {
            renderPlaylist();
            if (!videoPlayer.src || videoPlayer.src === "") {
                playVideo(0);
            }
        }

        // 2. Probe Photos
        photoGrid.innerHTML = '<div class="loading-feed" style="grid-column: 1/-1; padding: 40px;">СКАНУВАННЯ ФОТО-АРХІВУ...</div>';
        photoPlaylist = await findSequentialFiles(PHOTO_DIR, ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG'], 1, MAX_ITEMS);
        
        if (photoPlaylist.length === 0) {
            photoGrid.innerHTML = '<div class="loading-feed" style="color:var(--neon-blue); grid-column:1/-1; padding:40px;">АРХІВ ФОТО ПОРОЖНІЙ<br><small>Чекаю на ваші .jpg файли у папці photos/</small></div>';
        } else {
            renderGallery();
        }
    }

    async function findSequentialFiles(dir, extensions, start, max) {
        if (!Array.isArray(extensions)) extensions = [extensions];
        let found = [];
        let p = start;
        let keepSearching = true;

        while(keepSearching && p <= max) {
            let foundInStep = false;
            for (let ext of extensions) {
                let url = `${dir}${p}.${ext}`;
                let res = await checkFile(url, p);
                if (res.exists) {
                    found.push({ id: res.id, url: res.url, date: res.date });
                    foundInStep = true;
                    break;
                }
            }
            if (!foundInStep) keepSearching = false;
            p++;
        }
        return found;
    }

    async function checkFile(url, id) {
        try {
            const response = await fetch(url + '?v=' + new Date().getTime(), { method: 'HEAD' });
            if (response.ok) {
                let lastModified = response.headers.get('Last-Modified');
                let dateStr = "Unknown Date";
                if (lastModified) {
                    const d = new Date(lastModified);
                    dateStr = d.toLocaleDateString('uk-UA', { year: 'numeric', month: 'short', day: 'numeric' });
                } else {
                    dateStr = `FILE #${id}`;
                }
                return { exists: true, url, date: dateStr, id };
            }
        } catch (e) {}
        return { exists: false };
    }

    function renderPlaylist() {
        playlistContainer.innerHTML = '';
        videoPlaylist.forEach((video, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.dataset.index = index;
            item.innerHTML = `<div class="playlist-item-title">ВІДЕО #${video.id}</div><div class="playlist-item-date">${video.date}</div>`;
            item.addEventListener('click', () => playVideo(index));
            playlistContainer.appendChild(item);
        });
    }

    function playVideo(index) {
        if (index < 0 || index >= videoPlaylist.length) return;
        currentVideoIndex = index;
        const video = videoPlaylist[index];
        document.querySelectorAll('.playlist-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.querySelector(`.playlist-item[data-index="${index}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        videoPlayer.src = video.url;
        videoPlayer.play().catch(e => console.error("Auto-play prevented", e));
        titleHUD.textContent = `FILE: ${video.id}.MP4`;
        dateHUD.textContent = `DATE: ${video.date}`;
    }

    videoPlayer.addEventListener('ended', () => {
        let nextIndex = currentVideoIndex + 1;
        if (nextIndex < videoPlaylist.length) playVideo(nextIndex);
        else playVideo(0);
    });

    function renderGallery() {
        photoGrid.innerHTML = '';
        photoStats.textContent = `Знайдено: ${photoPlaylist.length}`;
        photoPlaylist.forEach((photo, index) => {
            const item = document.createElement('div');
            item.className = 'lab-photo-item';
            item.innerHTML = `<img src="${photo.url}" alt="Archive Photo ${photo.id}" loading="lazy"><div class="lab-photo-overlay"><span class="photo-id">IMG_${photo.id}</span><span class="photo-date">${photo.date}</span></div>`;
            item.addEventListener('click', () => openModal(index));
            photoGrid.appendChild(item);
        });
    }

    function openModal(index) {
        if (index < 0 || index >= photoPlaylist.length) return;
        currentPhotoIndexInModal = index;
        const photo = photoPlaylist[index];

        modal.style.display = "flex";
        updateModalContent(photo);
    }

    function updateModalContent(photo) {
        modalImg.src = photo.url;
        modalCaption.innerHTML = `<strong style="color:#00f3ff; font-size:1.2rem;">FILE: ${photo.id}.JPG</strong><br><span style="font-size: 0.9rem; color: #ccc; margin-top:10px; display:block;">DATE: ${photo.date}</span>`;
        modalCounter.textContent = `${currentPhotoIndexInModal + 1} / ${photoPlaylist.length}`;
    }

    function navigateModal(step) {
        let newIndex = currentPhotoIndexInModal + step;
        if (newIndex >= 0 && newIndex < photoPlaylist.length) {
            currentPhotoIndexInModal = newIndex;
            updateModalContent(photoPlaylist[newIndex]);
        }
    }

    function closeModal() {
        modal.style.display = "none";
        modalImg.src = "";
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalPrev) modalPrev.addEventListener('click', (e) => { e.stopPropagation(); navigateModal(-1); });
    if (modalNext) modalNext.addEventListener('click', (e) => { e.stopPropagation(); navigateModal(1); });
    
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    window.addEventListener('keydown', (e) => { 
        if (modal.style.display === "flex") {
            if (e.key === "Escape") closeModal();
            if (e.key === "ArrowLeft") navigateModal(-1);
            if (e.key === "ArrowRight") navigateModal(1);
        }
    });

    probeFiles();
    setInterval(probeFiles, 120000);
});
