import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ૧. વેબસાઇટ સેટિંગ્સ લોડ કરવા
async function loadSettings() {
    const docRef = doc(db, "settings", "general");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if(data.name && document.getElementById("gp-name")) {
            document.getElementById("gp-name").innerText = data.name;
        }
        if(data.tagline && document.getElementById("gp-tagline")) {
            document.getElementById("gp-tagline").innerText = data.tagline;
        }
        if(data.name && document.getElementById("banner-gp-name")) {
            document.getElementById("banner-gp-name").innerText = data.name;
        }
        if(data.tagline && document.getElementById("banner-gp-tagline")) {
            document.getElementById("banner-gp-tagline").innerText = data.tagline;
        }
    }
}

// ૨. પોસ્ટ્સ લોડ કરવી
async function loadPosts() {
    const querySnapshot = await getDocs(collection(db, "posts"));
    const container = document.getElementById("posts-container");
    if(!container) return;
    container.innerHTML = "";
    querySnapshot.forEach((docSnap) => {
        const item = docSnap.data();
        if(item.type === 'post') {
            container.innerHTML += `
                <div class="p-2 border-b bg-white rounded shadow-sm">
                    <h4 class="font-bold text-emerald-700">${item.title}</h4>
                    <p class="text-xs text-gray-600">${item.desc}</p>
                </div>
            `;
        }
    });
}

// ૩. નોટિસ લોડ કરવી
async function loadNotices() {
    const querySnapshot = await getDocs(collection(db, "posts"));
    const noticeList = document.getElementById("notice-list");
    if (!noticeList) return;
    
    noticeList.innerHTML = "";
    let hasNotice = false;

    querySnapshot.forEach((docSnap) => {
        const item = docSnap.data();
        if (item.type === 'notice') {
            hasNotice = true;
            noticeList.innerHTML += `
                <div class="border-b border-red-400/40 pb-2 mb-2 last:border-b-0">
                    <h5 class="font-bold text-white text-sm md:text-base leading-snug">• ${item.title}</h5>
                    <p class="text-xs text-red-100 mt-1 leading-relaxed pl-3">${item.desc}</p>
                </div>
            `;
        }
    });

    if (!hasNotice) {
        noticeList.innerHTML = "<p class='text-xs text-red-200'>હાલ કોઈ નવી નોટિસ નથી.</p>";
    }
}

// ૪. ઇતિહાસ બતાવવો
async function displayHistory() {
    const docSnap = await getDoc(doc(db, "settings", "village_history"));
    const historyContainer = document.getElementById("info-history");
    if (docSnap.exists() && historyContainer) {
        historyContainer.innerHTML = docSnap.data().content;
    }
}

// ૫. ફોટો ગેલેરી
async function displayGallery() {
    const querySnapshot = await getDocs(collection(db, "gallery"));
    const container = document.getElementById("gallery-container");
    if(!container) return;
    container.innerHTML = "";
    
    if (querySnapshot.empty) {
        container.innerHTML = "<p class='text-xs text-gray-500'>હાલ કોઈ ફોટા ઉમેરેલા નથી.</p>";
        return;
    }

    querySnapshot.forEach((docSnap) => {
        const item = docSnap.data();
        container.innerHTML += `
            <div class="flex-none w-64 bg-slate-50 p-2 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition gallery-card" data-url="${item.imageUrl}">
                <img src="${item.imageUrl}" alt="${item.title}" class="h-40 w-full object-cover rounded pointer-events-none">
                <p class="text-xs font-bold text-center mt-2 text-gray-700 truncate">${item.title}</p>
            </div>
        `;
    });

    let scrollAmount = 0;
    let autoScrollInterval = setInterval(() => {
        if (container) {
            scrollAmount += 1.5;
            if (scrollAmount >= container.scrollWidth - container.clientWidth) {
                scrollAmount = 0;
            }
            container.scrollLeft = scrollAmount;
        }
    }, 30);

    container.addEventListener("mouseenter", () => clearInterval(autoScrollInterval));
    container.addEventListener("mouseleave", () => {
        autoScrollInterval = setInterval(() => {
            if (container) {
                scrollAmount += 1.5;
                if (scrollAmount >= container.scrollWidth - container.clientWidth) {
                    scrollAmount = 0;
                }
                container.scrollLeft = scrollAmount;
            }
        }, 30);
    });

    document.querySelectorAll(".gallery-card").forEach(card => {
        card.addEventListener("click", () => {
            const url = card.getAttribute("data-url");
            const modal = document.getElementById("image-modal");
            const modalImg = document.getElementById("modal-img");
            if (modal && modalImg) {
                modalImg.src = url;
                modal.classList.remove("hidden");
                modal.classList.add("flex");
            }
        });
    });
}

// ૬. ફુલસ્ક્રીન મોડલ બંધ કરવા માટે
document.getElementById("close-modal-btn")?.addEventListener("click", () => {
    const modal = document.getElementById("image-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }
});

document.getElementById("image-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "image-modal") {
        e.target.classList.add("hidden");
        e.target.classList.remove("flex");
    }
});

// ૭. ફરિયાદ મોકલવા માટે
document.getElementById("complaint-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "complaints"), {
            name: document.getElementById("c-name").value,
            mobile: document.getElementById("c-mobile").value,
            faliya: document.getElementById("c-faliya").value,
            house: document.getElementById("c-house").value,
            type: document.getElementById("c-type").value,
            msg: document.getElementById("c-msg").value,
            status: "Pending",
            date: new Date().toLocaleDateString('gu-IN')
        });
        alert("તમારી ફરિયાદ સફળતાપૂર્વક નોંધાઈ ગઈ છે!");
        e.target.reset();
    } catch (err) {
        alert("ભૂલ આવી: " + err.message);
    }
});

// ૮. મોબાઈલ મેન્યૂ
document.getElementById("mobile-menu-btn")?.addEventListener("click", () => {
    const mobileMenu = document.getElementById("mobile-menu");
    if (mobileMenu) {
        mobileMenu.classList.toggle("hidden");
    }
});

// ૯. સમય પત્રક
async function loadFrontendSchedule() {
    const container = document.getElementById("frontend-schedule-list");
    if (!container) return;

    const snap = await getDocs(collection(db, "panchayat_schedule"));
    container.innerHTML = "";

    if (snap.empty) {
        container.innerHTML = "<p class='text-center text-gray-500 py-4 text-sm'>કોઈ માહિતી ઉપલબ્ધ નથી.</p>";
        return;
    }

    snap.forEach(docSnap => {
        const item = docSnap.data();
        
        // જો ફિલ્ડનું નામ અલગ હોય તો પણ ડેટા બતાવે તે માટેનું લોજિક
        const name = item.name || item.officerName || "-";
        const designation = item.designation || item.post || item.role || "-";
        const timing = item.timing || item.time || "-";
        const days = item.days || item.workDays || "-";
        const note = item.note || item.extraNote || "";

        container.innerHTML += `
            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-gray-900 text-base">${name}</h4>
                        <span class="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">${designation}</span>
                    </div>
                </div>
                <div class="text-xs text-gray-600 space-y-1 border-t pt-2">
                    <div><b>⏰ સમય:</b> ${timing}</div>
                    <div><b>📅 દિવસો:</b> ${days}</div>
                    ${note ? `<div class="text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1"><b>📌 નોંધ:</b> ${note}</div>` : ''}
                </div>
            </div>
        `;
    });
}

// ૧૦. પબ્લિક ડ્રોપડાઉન મેન્યૂ
async function loadVillageDetailsMenu() {
    const snap = await getDocs(collection(db, "village_details"));
    const container = document.getElementById("village-details-menu-list");
    if (!container) return;

    container.innerHTML = "";
    snap.forEach((docSnap) => {
        const item = docSnap.data();
        if (item.isShow !== false) {
            container.innerHTML += `
                <a href="details.html?id=${docSnap.id}" target="_blank" class="flex items-center gap-2 p-2 rounded-lg hover:bg-purple-50 text-purple-900 font-medium text-sm transition border-b border-purple-100">
                    <i class="fa-solid fa-chevron-right text-xs text-purple-600"></i>
                    <span>${item.title}</span>
                </a>
            `;
        }
    });
}

// 🚀 સબમિટ/સ્ટાર્ટઅપ પ્રોસેસ
loadSettings();
loadPosts();
loadNotices();
displayHistory();
displayGallery();
loadFrontendSchedule();
loadVillageDetailsMenu();
