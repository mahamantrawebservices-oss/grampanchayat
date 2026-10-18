import { db } from "./firebase-config.js";
import { collection, onSnapshot, addDoc, getDocs, doc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// URL માંથી પંચાયત આઈડી મેળવવું (ડિફોલ્ટ ડેમો આઈડી જો લિંકમાં ન હોય તો)
const urlParams = new URLSearchParams(window.location.search);
const panchayatId = urlParams.get('id') || "ahmedabad_daskroi_motapipalva";

// 🔒 1. Global Maintenance & Active/Deactive Guard Check
async function checkSystemAccess() {
    try {
        // Global Maintenance Check
        const maintSnap = await getDoc(doc(db, "system_settings", "global_config"));
        if (maintSnap.exists() && maintSnap.data().isMaintenance) {
            const msg = maintSnap.data().maintenanceMessage || "સિસ્ટમ મેન્ટેનન્સ મોડમાં છે.";
            document.body.innerHTML = `
                <div class="fixed inset-0 bg-slate-900 text-white z-50 flex flex-col items-center justify-center p-6 text-center">
                    <div class="bg-slate-800 p-8 rounded-3xl border border-slate-700 max-w-lg shadow-2xl space-y-4">
                        <i class="fa-solid fa-screwdriver-wrench text-6xl text-amber-400 animate-bounce"></i>
                        <h2 class="text-2xl font-bold text-amber-400">સિસ્ટમ મેન્ટેનન્સ ચાલુ છે</h2>
                        <p class="text-gray-300 text-sm">${msg}</p>
                    </div>
                </div>`;
            return false;
        }

        // Panchayat Active/Deactive Status Check
        const pSnap = await getDoc(doc(db, "panchayats", panchayatId));
        if (pSnap.exists() && pSnap.data().isActive === false) {
            document.body.innerHTML = `
                <div class="fixed inset-0 bg-gray-900/90 text-white z-40 flex flex-col items-center justify-center p-6 text-center">
                    <div class="bg-white text-gray-800 p-8 rounded-3xl max-w-md shadow-2xl space-y-4">
                        <i class="fa-solid fa-circle-exclamation text-6xl text-red-500"></i>
                        <h2 class="text-xl font-bold text-red-600">સબ્સ્ક્રિપ્શન નિષ્ક્રિય છે (Deactive)</h2>
                        <p class="text-gray-600 text-sm">આ ગ્રામ પંચાયતની વેબસાઇટ સેવા હાલ પૂરતી સ્થગિત કરવામાં આવી છે. કૃપા કરીને વહીવટી કચેરીનો સંપર્ક કરો.</p>
                    </div>
                </div>`;
            return false;
        }
    } catch (err) {
        console.error("Access Check Error:", err);
    }
    return true;
}

// ૧. વેબસાઇટ સેટિંગ્સ લોડ કરવા
async function loadSettings() {
    const docRef = doc(db, "panchayats", panchayatId, "settings", "general");
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

// ૨. તાજી પોસ્ટ્સ અને ન્યૂઝ લોડ કરવા (Real-time Live Sync)
function loadPosts() {
    const container = document.getElementById("posts-container");
    if (!container) return;

    onSnapshot(collection(db, "panchayats", panchayatId, "posts"), (querySnapshot) => {
        container.innerHTML = "";

        if (querySnapshot.empty) {
            container.innerHTML = `<p class="text-gray-500 text-center text-xs p-2">હાલમાં કોઈ પોસ્ટ ઉપલબ્ધ નથી.</p>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const item = docSnap.data();
            if (!item.type || item.type === 'post') {
                const title = item.title || "અનામી પોસ્ટ";
                const desc = item.desc || "";

                container.innerHTML += `
                    <div class="p-3 border-b bg-white rounded shadow-sm hover:shadow transition space-y-1">
                        <h4 class="font-bold text-emerald-700 text-sm">${title}</h4>
                        ${desc ? `<p class="text-xs text-gray-600 whitespace-pre-line leading-relaxed">${desc}</p>` : ''}
                    </div>
                `;
            }
        });
    }, (err) => {
        console.error("Posts Load Error:", err);
        container.innerHTML = `<p class="text-xs text-red-500 text-center">પોસ્ટ લોડ થવામાં ભૂલ આવી.</p>`;
    });
}

// ૩. નોટિસ લોડ કરવી
function loadFrontendNotices() {
    const noticeList = document.getElementById("notice-list");
    if (!noticeList) return;

    onSnapshot(collection(db, "panchayats", panchayatId, "notices"), (snapshot) => {
        noticeList.innerHTML = "";

        if (snapshot.empty) {
            noticeList.innerHTML = `<p class="text-white/80 text-xs italic">હાલમાં કોઈ નવી નોટિસ નથી.</p>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const title = data.title || data.noticeTitle || data.subject || data.heading || "અગત્યની સૂચના";
            const desc = data.desc || data.description || data.details || data.message || data.content || "";
            
            let dateStr = "";
            if (data.createdAt?.toDate) {
                dateStr = data.createdAt.toDate().toLocaleDateString('gu-IN');
            } else if (data.date) {
                dateStr = data.date;
            }

            const card = document.createElement("div");
            card.className = "bg-red-700/60 backdrop-blur-sm p-3 rounded-lg border border-red-400/40 space-y-1 shadow-sm";
            card.innerHTML = `
                <div class="flex justify-between items-start gap-2">
                    <h5 class="font-bold text-white text-base flex items-center gap-1.5">
                        <span class="text-amber-300">📌</span> ${title}
                    </h5>
                    ${dateStr ? `<span class="text-[11px] bg-red-900/80 text-amber-200 px-2 py-0.5 rounded-full font-sans border border-amber-300/30 shrink-0">${dateStr}</span>` : ''}
                </div>
                ${desc ? `<p class="text-white/95 text-xs whitespace-pre-line leading-relaxed pl-5">${desc}</p>` : ''}
            `;

            noticeList.appendChild(card);
        });
    }, (error) => {
        console.error("Error loading notices:", error);
        noticeList.innerHTML = `<p class="text-white/80 text-xs">નોટિસ લોડ કરવામાં ભૂલ આવી.</p>`;
    });
}

// ૪. ઇતિહાસ બતાવવો
async function displayHistory() {
    const docSnap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "village_history"));
    const historyContainer = document.getElementById("info-history");
    if (docSnap.exists() && historyContainer) {
        historyContainer.innerHTML = docSnap.data().content;
    }
}

// ૫. ફોટો ગેલેરી
async function displayGallery() {
    const querySnapshot = await getDocs(collection(db, "panchayats", panchayatId, "gallery"));
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
        await addDoc(collection(db, "panchayats", panchayatId, "complaints"), {
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

    const snap = await getDocs(collection(db, "panchayats", panchayatId, "panchayat_schedule"));
    container.innerHTML = "";

    if (snap.empty) {
        container.innerHTML = "<p class='text-center text-gray-500 py-4 text-sm'>કોઈ માહિતી ઉપલબ્ધ નથી.</p>";
        return;
    }

    snap.forEach(docSnap => {
        const item = docSnap.data();
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

// ૧૦. ગામ અને પંચાયત વિગત પબ્લિક ડ્રોપડાઉન મેન્યૂ
async function loadVillageDetailsMenu() {
    const snap = await getDocs(collection(db, "panchayats", panchayatId, "village_details"));
    const container = document.getElementById("village-details-menu-list");
    if (!container) return;

    container.innerHTML = "";
    snap.forEach((docSnap) => {
        const item = docSnap.data();
        if (item.isShow !== false) {
            container.innerHTML += `
                <a href="details.html?id=${docSnap.id}&p=${panchayatId}" target="_blank" class="flex items-center gap-2 p-2 rounded-lg hover:bg-purple-50 text-purple-900 font-medium text-sm transition border-b border-purple-100">
                    <i class="fa-solid fa-chevron-right text-xs text-purple-600"></i>
                    <span>${item.title}</span>
                </a>
            `;
        }
    });
}

// 11. વેરો ભરો બટન સેક્શન
async function setupTaxLink() {
    const taxBtn = document.getElementById("pay-tax-btn");
    if (!taxBtn) return;

    try {
        const docSnap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "tax_payment"));
        if (docSnap.exists() && docSnap.data().url) {
            taxBtn.href = docSnap.data().url;
            taxBtn.target = "_blank";
        }
    } catch (err) {
        console.error("ટેક્સ લિંક લોડ કરવામાં ભૂલ:", err);
    }
}

// 12. ડાયનેમિક બટન સેક્શન
async function loadCustomButtons() {
    const container = document.getElementById("custom-buttons-container");
    if (!container) return;

    try {
        const snap = await getDocs(collection(db, "panchayats", panchayatId, "custom_pages"));
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<p class='text-xs text-gray-500 col-span-full text-center py-2'>હાલ કોઈ વધારાની સેવા ઉમેરાયેલ નથી.</p>";
            return;
        }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const pageId = docSnap.id;

            container.innerHTML += `
                <a href="custom-page.html?id=${pageId}&p=${panchayatId}" 
                   class="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold p-3 rounded-xl shadow-sm hover:shadow text-xs md:text-sm text-center flex flex-col items-center justify-center gap-2 transition transform hover:-translate-y-0.5">
                    <i class="fa-solid fa-link text-lg"></i>
                    <span>${data.buttonTitle}</span>
                </a>
            `;
        });
    } catch (err) {
        console.error("બટનો લોડ કરવામાં ભૂલ:", err);
    }
}

// 13. Events સેક્શન
async function loadUpcomingEvents() {
    const container = document.getElementById("events-container");
    if (!container) return;

    try {
        const snap = await getDocs(collection(db, "panchayats", panchayatId, "events"));
        container.innerHTML = "";

        const today = new Date().toISOString().split('T')[0];
        let hasEvents = false;

        if (snap.empty) {
            container.innerHTML = "<p class='text-xs text-gray-500 col-span-full text-center py-4'>હાલ કોઈ આવનારો કાર્યક્રમ નથી.</p>";
            return;
        }

        for (const docSnap of snap.docs) {
            const data = docSnap.data();

            if (data.eventDate < today) {
                await deleteDoc(doc(db, "panchayats", panchayatId, "events", docSnap.id));
                continue;
            }

            hasEvents = true;
            const formattedDate = new Date(data.eventDate).toLocaleDateString('gu-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            container.innerHTML += `
                <div class="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 shadow-sm hover:shadow transition flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300/50 flex items-center gap-1">
                                <i class="fa-regular fa-calendar"></i> ${formattedDate}
                            </span>
                        </div>
                        <h4 class="font-bold text-gray-800 text-sm md:text-base mb-1">${data.eventName}</h4>
                        <p class="text-xs text-gray-600 flex items-start gap-1.5 mt-2">
                            <i class="fa-solid fa-location-dot text-amber-600 mt-0.5"></i>
                            <span>${data.eventLocation}</span>
                        </p>
                    </div>
                </div>
            `;
        }

        if (!hasEvents) {
            container.innerHTML = "<p class='text-xs text-gray-500 col-span-full text-center py-4'>હાલ કોઈ આવનારો કાર્યક્રમ નથી.</p>";
        }

    } catch (err) {
        console.error("ઇવેન્ટ્સ લોડ કરવામાં ભૂલ:", err);
    }
}

// ૧૪. આપત્તિ વ્યવસ્થાપન મોડલ ખોલવાનું ફંક્શન
window.openDisasterPage = async function(key, title) {
    const modal = document.getElementById('disaster-modal');
    const modalTitle = document.getElementById('disaster-modal-title');
    const modalContent = document.getElementById('disaster-modal-content');

    if (!modal) return;

    modalTitle.innerText = title;
    modalContent.innerHTML = "<p class='text-gray-500 font-bold animate-pulse'>Firebase માંથી માહિતી લોડ થઈ રહી છે...</p>";

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    try {
        const docRef = doc(db, "panchayats", panchayatId, "disaster_management", key);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().content) {
            modalContent.innerHTML = docSnap.data().content;
        } else {
            modalContent.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    <p class="text-base font-semibold">હજુ સુધી કોઈ માહિતી ઉમેરવામાં આવી નથી.</p>
                </div>`;
        }
    } catch (error) {
        console.error("ડેટા મેળવવામાં ભૂલ:", error);
        modalContent.innerHTML = "<p class='text-red-500'>માહિતી લોડ કરવામાં ભૂલ આવી.</p>";
    }
};

window.closeDisasterPage = function() {
    const modal = document.getElementById('disaster-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

document.addEventListener('click', function(event) {
    const modal = document.getElementById('disaster-modal');
    if (event.target === modal) {
        closeDisasterPage();
    }
});

// 🚀 સબમિટ/સ્ટાર્ટઅપ પ્રોસેસ (પ્રથમ એક્સેસ ચેક થશે, પછી જ બધું લોડ થશે)
async function initApp() {
    const isAllowed = await checkSystemAccess();
    if (!isAllowed) return;

    loadSettings();
    loadPosts();
    loadFrontendNotices();
    displayHistory();
    displayGallery();
    loadFrontendSchedule();
    loadVillageDetailsMenu();
    setupTaxLink();
    loadCustomButtons();
    loadUpcomingEvents();
}

initApp();
