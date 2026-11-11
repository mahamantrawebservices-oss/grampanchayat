import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, getDocs, doc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCMhWWI_6oxPIVEQEVlq2SIBf72EI2o8NI",
    authDomain: "gram-panchayat-33c86.firebaseapp.com",
    projectId: "gram-panchayat-33c86",
    storageBucket: "gram-panchayat-33c86.firebasestorage.app",
    messagingSenderId: "1025176315779",
    appId: "1:1025176315779:web:a24ca10a06c55edcc8f8b6",
    measurementId: "G-TQBSXCWNBV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const panchayatId = urlParams.get('id') || "517045";

// 🔒 System Access Check
async function checkSystemAccess() {
    try {
        const maintSnap = await getDoc(doc(db, "system_settings", "global_config"));
        if (maintSnap.exists() && maintSnap.data().isMaintenance) {
            document.body.innerHTML = `
                <div class="fixed inset-0 bg-slate-900 text-white z-50 flex flex-col items-center justify-center p-6 text-center">
                    <div class="bg-slate-800 p-8 rounded-3xl border border-slate-700 max-w-lg shadow-2xl space-y-4">
                        <i class="fa-solid fa-screwdriver-wrench text-6xl text-amber-400 animate-bounce"></i>
                        <h2 class="text-2xl font-bold text-amber-400">સિસ્ટમ મેન્ટેનન્સ ચાલુ છે</h2>
                        <p class="text-gray-300 text-sm">${maintSnap.data().maintenanceMessage || "સિસ્ટમ મેન્ટેનન્સ મોડમાં છે."}</p>
                    </div>
                </div>`;
            return false;
        }

        const pSnap = await getDoc(doc(db, "panchayats", panchayatId));
        if (pSnap.exists() && pSnap.data().isActive === false) {
            document.body.innerHTML = `
                <div class="fixed inset-0 bg-gray-900/90 text-white z-40 flex flex-col items-center justify-center p-6 text-center">
                    <div class="bg-white text-gray-800 p-8 rounded-3xl max-w-md shadow-2xl space-y-4">
                        <i class="fa-solid fa-circle-exclamation text-6xl text-red-500"></i>
                        <h2 class="text-xl font-bold text-red-600">સબ્સ્ક્રિપ્શન નિષ્ક્રિય છે (Deactive)</h2>
                        <p class="text-gray-600 text-sm">આ ગ્રામ પંચાયતની વેબસાઇટ સેવા હાલ પૂરતી સ્થગિત કરવામાં આવી છે.</p>
                    </div>
                </div>`;
            return false;
        }
    } catch (err) {
        console.error("Access Check Error:", err);
    }
    return true;
}

// 🔗 ઓટોમેટિક તમામ લિંક્સમાં LGD Code જોડવાનું ફંક્શન
function updateDynamicLinks() {
    if (!panchayatId) return;
    document.querySelectorAll("a").forEach(link => {
        const href = link.getAttribute("href");
        if (href && !href.startsWith("http") && !href.startsWith("#") && !href.includes("id=")) {
            const separator = href.includes("?") ? "&" : "?";
            link.setAttribute("href", `${href}${separator}id=${panchayatId}`);
        }
    });
}

async function loadSettings() {
    try {
        const docSnap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "general"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if(data.name && document.getElementById("gp-name")) document.getElementById("gp-name").innerText = data.name;
            if(data.tagline && document.getElementById("gp-tagline")) document.getElementById("gp-tagline").innerText = data.tagline;
            if(data.name && document.getElementById("banner-gp-name")) document.getElementById("banner-gp-name").innerText = data.name;
            if(data.tagline && document.getElementById("banner-gp-tagline")) document.getElementById("banner-gp-tagline").innerText = data.tagline;
        }
    } catch (err) {
        console.error("Settings Load Error:", err);
    }
}

function loadPosts() {
    const container = document.getElementById("posts-container");
    if (!container) return;
    onSnapshot(collection(db, "panchayats", panchayatId, "posts"), (snapshot) => {
        container.innerHTML = "";
        if (snapshot.empty) {
            container.innerHTML = `<p class="text-gray-500 text-center text-xs p-2">હાલમાં કોઈ પોસ્ટ ઉપલબ્ધ નથી.</p>`;
            return;
        }
        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            container.innerHTML += `
                <div class="p-3 border-b bg-white rounded shadow-sm space-y-1">
                    <h4 class="font-bold text-emerald-700 text-sm">${item.title || "અનામી પોસ્ટ"}</h4>
                    ${item.desc ? `<p class="text-xs text-gray-600 whitespace-pre-line">${item.desc}</p>` : ''}
                </div>
            `;
        });
    }, (err) => console.error("Posts Error:", err));
}

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
            noticeList.innerHTML += `
                <div class="bg-red-700/65 backdrop-blur-sm p-3 rounded-lg border border-red-400/40 space-y-1 shadow-sm">
                    <h5 class="font-bold text-white text-base flex items-center gap-1.5">
                        <span class="text-amber-300">📌</span> ${data.title || "અગત્યની સૂચના"}
                    </h5>
                    ${data.desc ? `<p class="text-white/95 text-xs whitespace-pre-line pl-5">${data.desc}</p>` : ''}
                </div>
            `;
        });
    }, (err) => console.error("Notices Error:", err));
}

async function loadFrontendStaffAndCommittee() {
    try {
        const metaSnap = await getDoc(doc(db, "panchayats", panchayatId, "panchayat_meta", "staff_page"));
        if (metaSnap.exists()) {
            const mData = metaSnap.data();
            if (document.getElementById("term-display")) document.getElementById("term-display").innerText = "મુદત: " + (mData.term || "-");
            if (document.getElementById("note-display")) document.getElementById("note-display").innerText = mData.note || "";
        }

        const commContainer = document.getElementById("frontend-committee-list");
        if (commContainer) {
            const commSnap = await getDocs(collection(db, "panchayats", panchayatId, "panchayat_committee"));
            commContainer.innerHTML = commSnap.empty ? `<p class="text-xs text-gray-400">કોઈ કમિટી સભ્ય નથી.</p>` : "";
            commSnap.forEach(d => {
                const item = d.data();
                commContainer.innerHTML += `<div class="bg-white p-3 rounded-xl border shadow-sm space-y-1"><h4 class="font-bold text-gray-900 text-sm">${item.name}</h4><p class="text-xs text-emerald-700 font-semibold">${item.designation}</p><p class="text-xs text-gray-600"><i class="fa-solid fa-phone"></i> ${item.mobile || '-'}</p></div>`;
            });
        }

        const staffContainer = document.getElementById("frontend-staff-list");
        if (staffContainer) {
            const staffSnap = await getDocs(collection(db, "panchayats", panchayatId, "panchayat_staff"));
            staffContainer.innerHTML = staffSnap.empty ? `<p class="text-xs text-gray-400">કોઈ કર્મચારી નથી.</p>` : "";
            staffSnap.forEach(d => {
                const item = d.data();
                staffContainer.innerHTML += `<div class="bg-white p-3 rounded-xl border shadow-sm space-y-1"><h4 class="font-bold text-gray-900 text-sm">${item.name}</h4><p class="text-xs text-blue-700 font-semibold">${item.designation}</p><p class="text-xs text-gray-600"><i class="fa-solid fa-phone"></i> ${item.mobile || '-'}</p></div>`;
            });
        }
    } catch (err) { console.error("Staff/Committee Error:", err); }
}

async function loadFrontendSchedule() {
    const container = document.getElementById("frontend-schedule-list");
    if (!container) return;
    try {
        const snap = await getDocs(collection(db, "panchayats", panchayatId, "panchayat_schedule"));
        container.innerHTML = snap.empty ? "<p class='text-center text-gray-400 py-2 text-xs'>કોઈ સમયપત્રક નથી.</p>" : "";
        snap.forEach(docSnap => {
            const item = docSnap.data();
            container.innerHTML += `
                <div class="bg-white p-3 rounded-xl border shadow-sm space-y-1">
                    <h4 class="font-bold text-gray-900 text-sm">${item.name || '-'}</h4>
                    <span class="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">${item.designation || '-'}</span>
                    <div class="text-xs text-gray-600 space-y-0.5 pt-1">
                        <div><b>⏰ સમય:</b> ${item.timing || '-'}</div>
                        <div><b>📅 દિવસો:</b> ${item.days || '-'}</div>
                    </div>
                </div>`;
        });
    } catch (err) { console.error("Schedule Error:", err); }
}

async function setupComplaintSection() {
    try {
        const configSnap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "complaint_config"));
        let isEnabled = true;
        if (configSnap.exists()) {
            const data = configSnap.data();
            if (data.isEnabled === false || data.isEnabled === "false") {
                isEnabled = false;
            }
        }

        if (!isEnabled) {
            const container = document.getElementById("complaint-section-container");
            if (container) {
                container.innerHTML = `
                    <div class="bg-amber-50 border border-amber-300 p-6 rounded-2xl text-center space-y-2 my-4">
                        <i class="fa-solid fa-triangle-exclamation text-3xl text-amber-600"></i>
                        <h3 class="font-bold text-amber-900 text-base">ફરિયાદ નિવારણ સેવાનો પ્રવાહ હાલ બંધ છે</h3>
                        <p class="text-xs text-amber-700">પંચાયત વહીવટી તંત્ર દ્વારા હાલમાં આ સુવિધા અસ્થાયી રૂપે બંધ રાખવામાં આવી છે.</p>
                    </div>`;
            }
        }
    } catch (err) {
        console.error("Complaint Config Error:", err);
    }
}

// 🏡 ગામ અને પંચાયત વિગત મેનૂ લોડ કરવા માટે
async function loadPublicVillageDetailsMenu() {
    const container = document.getElementById("village-details-menu-list");
    if (!container) return;

    try {
        const detailsColRef = collection(db, "panchayats", panchayatId, "village_details");
        const snap = await getDocs(detailsColRef);
        
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = `<p class="text-xs text-gray-400 p-2">હાલમાં કોઈ માહિતી ઉપલબ્ધ નથી.</p>`;
            return;
        }

        let hasVisibleItem = false;

        snap.forEach(d => {
            const item = d.data();
            const menuId = d.id;
            const isShow = item.isShow !== false;

            if (!isShow) return; 

            hasVisibleItem = true;

            container.innerHTML += `
                <a href="details.html?id=${panchayatId}&menuId=${menuId}" class="flex items-center justify-between bg-purple-50/50 hover:bg-purple-100/70 border border-purple-200 p-3 rounded-xl transition text-xs font-semibold text-purple-950 shadow-sm group">
                    <span class="flex items-center gap-2">
                        <i class="fa-solid fa-circle-chevron-right text-purple-600 group-hover:translate-x-1 transition"></i>
                        ${item.title || 'વિગત'}
                    </span>
                    <span class="text-purple-700 bg-purple-200/60 px-2 py-1 rounded text-[10px]">વિગત જુઓ →</span>
                </a>
            `;
        });

        if (!hasVisibleItem) {
            container.innerHTML = `<p class="text-xs text-gray-400 p-2">હાલમાં કોઈ માહિતી ઉપલબ્ધ નથી.</p>`;
        }
    } catch (err) {
        console.error("Public Village Details Menu Error:", err);
        container.innerHTML = `<p class="text-xs text-red-400 p-2">માહિતી લોડ કરવામાં ભૂલ આવી.</p>`;
    }
}

// --- મિલકત વેરા લિંક ડાયનેમિક સેટ કરવા માટે ---
async function loadPublicTaxLink() {
    try {
        const taxDocRef = doc(db, "panchayats", panchayatId, "settings", "tax_payment");
        const snap = await getDoc(taxDocRef);
        
        const taxBtn = document.getElementById("pay-tax-btn");
        if (snap.exists() && taxBtn) {
            const data = snap.data();
            if (data.url && data.url.trim() !== "") {
                taxBtn.href = data.url.trim();
            }
        }
    } catch (err) {
        console.error("Public Tax Link Load Error:", err);
    }
}

// --- કસ્ટમ બટન્સ લોડ કરવા માટે ---
async function loadPublicCustomButtons() {
    const container = document.getElementById("custom-buttons-container");
    if (!container) return;

    try {
        const customPagesRef = collection(db, "panchayats", panchayatId, "custom_pages");
        const snap = await getDocs(customPagesRef);
        
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = `<p class="text-xs text-gray-400 col-span-full text-center py-2">હાલમાં કોઈ અન્ય સેવાઓ ઉપલબ્ધ નથી.</p>`;
            return;
        }

        snap.forEach(d => {
            const item = d.data();
            const pageId = d.id;
            
            container.innerHTML += `
                <a href="custom-page.html?id=${panchayatId}&pageId=${pageId}" class="bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200/60 p-4 rounded-xl shadow-sm hover:shadow transition flex flex-col items-center text-center group">
                    <div class="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center mb-2 shadow group-hover:scale-110 transition">
                        <i class="fa-solid fa-file-lines text-sm"></i>
                    </div>
                    <span class="font-bold text-gray-800 text-xs md:text-sm line-clamp-2">${item.buttonTitle || 'સેવા'}</span>
                </a>
            `;
        });
    } catch (err) {
        console.error("Load Public Custom Buttons Error:", err);
        container.innerHTML = `<p class="text-xs text-red-400 col-span-full text-center py-2">બટનો લોડ કરવામાં ભૂલ આવી.</p>`;
    }
}

// --- ઇવેન્ટ્સ લોડ કરવા માટે ---
async function loadPublicEvents() {
    const container = document.getElementById("events-container");
    if (!container) return;

    try {
        const eventsRef = collection(db, "panchayats", panchayatId, "events");
        const snap = await getDocs(eventsRef);
        
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = `<p class="text-xs text-gray-400 col-span-full text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">હાલમાં કોઈ આવનારા કાર્યક્રમો કે પ્રસંગો ઉપલબ્ધ નથી.</p>`;
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let validEventsCount = 0;

        snap.forEach(d => {
            const item = d.data();
            if (!item.eventDate) return;

            const eventDateObj = new Date(item.eventDate);
            eventDateObj.setHours(0, 0, 0, 0);

            if (eventDateObj >= today) {
                validEventsCount++;
                container.innerHTML += `
                    <div class="bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-amber-200/70 p-4 rounded-2xl shadow-sm hover:shadow transition flex flex-col justify-between space-y-3">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <i class="fa-regular fa-calendar"></i> ${item.eventDate}
                                </span>
                            </div>
                            <h4 class="font-bold text-gray-900 text-sm md:text-base mb-1">${item.eventName || 'કાર્યક્રમ'}</h4>
                            <p class="text-xs text-gray-600 flex items-center gap-1.5">
                                <i class="fa-solid fa-location-dot text-amber-600"></i> ${item.eventLocation || '-'}
                            </p>
                        </div>
                    </div>
                `;
            }
        });

        if (validEventsCount === 0) {
            container.innerHTML = `<p class="text-xs text-gray-400 col-span-full text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">હાલમાં કોઈ આવનારા કાર્યક્રમો કે પ્રસંગો ઉપલબ્ધ નથી.</p>`;
        }

    } catch (err) {
        console.error("Public Events Load Error:", err);
        container.innerHTML = `<p class="text-xs text-red-400 col-span-full text-center py-2">ઇવેન્ટ્સ લોડ કરવામાં ભૂલ આવી.</p>`;
    }
}

// --- આપત્તિ વ્યવસ્થાપન મોડલ ઓપન અને લોડ કરવા માટે ---
async function openDisasterPage(pageKey, pageTitle) {
    const modal = document.getElementById("disaster-modal");
    const modalTitle = document.getElementById("disaster-modal-title");
    const modalContent = document.getElementById("disaster-modal-content");

    if (!modal || !modalTitle || !modalContent) return;

    modalTitle.innerText = pageTitle;
    modalContent.innerHTML = "<p class='text-center text-gray-500 py-4'>માહિતી લોડ થઈ રહી છે...</p>";
    
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    try {
        // જો ગેલેરી હોય તો sub-collection માંથી ફોટા ફેચ કરવા
        if (pageKey === 'disaster_gallery') {
            const gallerySnap = await getDocs(collection(db, "panchayats", panchayatId, "disaster_gallery"));
            
            if (gallerySnap.empty) {
                modalContent.innerHTML = "<p class='text-gray-500 text-center py-4'>હાલમાં ગેલેરીમાં કોઈ ફોટા ઉપલબ્ધ નથી.</p>";
                return;
            }

            let galleryHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">`;
            gallerySnap.forEach(d => {
                const item = d.data();
                galleryHTML += `
                    <div class="bg-gray-50 border rounded-xl overflow-hidden shadow-sm flex flex-col">
                        <img src="${item.imageUrl}" class="w-full h-40 object-cover" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                        <div class="p-3">
                            <h4 class="font-bold text-gray-800 text-xs text-center">${item.title || 'ફોટો'}</h4>
                        </div>
                    </div>
                `;
            });
            galleryHTML += `</div>`;
            modalContent.innerHTML = galleryHTML;

        } else {
            // અન્ય સ્ટાન્ડર્ડ પેજ (Contacts, Mock Drills, VDRMP) માટે
            const docRef = doc(db, "panchayats", panchayatId, "disaster_management", pageKey);
            const snap = await getDoc(docRef);

            if (snap.exists() && snap.data().content) {
                modalContent.innerHTML = snap.data().content;
            } else {
                modalContent.innerHTML = "<p class='text-gray-500 text-center py-4'>આ વિભાગ માટે હજુ સુધી કોઈ માહિતી ઉમેરવામાં આવી નથી.</p>";
            }
        }
    } catch (err) {
        console.error("Open Disaster Page Error:", err);
        modalContent.innerHTML = "<p class='text-red-500 text-center py-4'>માહિતી લોડ કરવામાં ટેકનિકલ સમસ્યા આવી.</p>";
    }
}


// --- આપત્તિ વ્યવસ્થાપન મોડલ ઓપન અને લોડ કરવા માટે (કોડ પૂર્ણ) ---



// 🚀 મુખ્ય ઇનિશિયલાઈઝેશન
async function initApp() {
    const isAllowed = await checkSystemAccess();
    if (!isAllowed) return;

    loadSettings();
    loadPosts();
    loadFrontendNotices();
    loadFrontendStaffAndCommittee();
    loadFrontendSchedule();
    loadPublicVillageDetailsMenu();
    loadPublicTaxLink();
    loadPublicCustomButtons();
    loadPublicEvents();
    await setupComplaintSection();
    updateDynamicLinks();
}

document.addEventListener("DOMContentLoaded", initApp);
