import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, getDocs, doc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- સેન્ટ્રલ ફાયરબેઝ કન્ફિગરેશન ---
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

// URL માંથી પંચાયત આઈડી (LGD Code) મેળવવું
const urlParams = new URLSearchParams(window.location.search);
const panchayatId = urlParams.get('id') || "ahmedabad_daskroi_motapipalva";

// 🔒 1. Global Maintenance & Active/Deactive Guard Check
async function checkSystemAccess() {
    try {
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
        if(data.name && document.getElementById("gp-name")) document.getElementById("gp-name").innerText = data.name;
        if(data.tagline && document.getElementById("gp-tagline")) document.getElementById("gp-tagline").innerText = data.tagline;
        if(data.name && document.getElementById("banner-gp-name")) document.getElementById("banner-gp-name").innerText = data.name;
        if(data.tagline && document.getElementById("banner-gp-tagline")) document.getElementById("banner-gp-tagline").innerText = data.tagline;
    }
}

// ૨. તાજી પોસ્ટ્સ અને ન્યૂઝ લોડ કરવા
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
            container.innerHTML += `
                <div class="p-3 border-b bg-white rounded shadow-sm hover:shadow transition space-y-1">
                    <h4 class="font-bold text-emerald-700 text-sm">${item.title || "અનામી પોસ્ટ"}</h4>
                    ${item.desc ? `<p class="text-xs text-gray-600 whitespace-pre-line leading-relaxed">${item.desc}</p>` : ''}
                </div>
            `;
        });
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
            const title = data.title || "અગત્યની સૂચના";
            const desc = data.desc || "";
            
            noticeList.innerHTML += `
                <div class="bg-red-700/60 backdrop-blur-sm p-3 rounded-lg border border-red-400/40 space-y-1 shadow-sm">
                    <h5 class="font-bold text-white text-base flex items-center gap-1.5">
                        <span class="text-amber-300">📌</span> ${title}
                    </h5>
                    ${desc ? `<p class="text-white/95 text-xs whitespace-pre-line leading-relaxed pl-5">${desc}</p>` : ''}
                </div>
            `;
        });
    });
}

// ૪. પંચાયત કમિટી અને સ્ટાફ લોડ કરવા (સંપૂર્ણ સુધારેલ)
async function loadFrontendStaffAndCommittee() {
    try {
        // મેટા માહિતી (મુદત અને નોંધ)
        const metaSnap = await getDoc(doc(db, "panchayats", panchayatId, "panchayat_meta", "staff_page"));
        if (metaSnap.exists()) {
            const mData = metaSnap.data();
            if (document.getElementById("term-display")) document.getElementById("term-display").innerText = mData.term || "";
            if (document.getElementById("note-display")) document.getElementById("note-display").innerText = mData.note || "";
        }

        // કમિટી સભ્યો
        const commContainer = document.getElementById("frontend-committee-list");
        if (commContainer) {
            const commSnap = await getDocs(collection(db, "panchayats", panchayatId, "panchayat_committee"));
            commContainer.innerHTML = "";
            if (commSnap.empty) {
                commContainer.innerHTML = `<p class="text-xs text-gray-500">કોઈ કમિટી સભ્ય ઉપલબ્ધ નથી.</p>`;
            } else {
                commSnap.forEach(d => {
                    const item = d.data();
                    commContainer.innerHTML += `
                        <div class="bg-white p-3 rounded-xl border shadow-sm space-y-1">
                            <h4 class="font-bold text-gray-900 text-sm">${item.name}</h4>
                            <p class="text-xs text-emerald-700 font-semibold">${item.designation}</p>
                            <p class="text-xs text-gray-600"><i class="fa-solid fa-phone"></i> ${item.mobile || '-'}</p>
                            ${item.ward ? `<p class="text-[11px] text-gray-500">વર્ડ: ${item.ward}</p>` : ''}
                        </div>
                    `;
                });
            }
        }

        // સ્ટાફ સભ્યો
        const staffContainer = document.getElementById("frontend-staff-list");
        if (staffContainer) {
            const staffSnap = await getDocs(collection(db, "panchayats", panchayatId, "panchayat_staff"));
            staffContainer.innerHTML = "";
            if (staffSnap.empty) {
                staffContainer.innerHTML = `<p class="text-xs text-gray-500">કોઈ કર્મચારી ઉપલબ્ધ નથી.</p>`;
            } else {
                staffSnap.forEach(d => {
                    const item = d.data();
                    staffContainer.innerHTML += `
                        <div class="bg-white p-3 rounded-xl border shadow-sm space-y-1">
                            <h4 class="font-bold text-gray-900 text-sm">${item.name}</h4>
                            <p class="text-xs text-blue-700 font-semibold">${item.designation}</p>
                            <p class="text-xs text-gray-600"><i class="fa-solid fa-phone"></i> ${item.mobile || '-'}</p>
                        </div>
                    `;
                });
            }
        }
    } catch (err) {
        console.error("Staff/Committee Load Error:", err);
    }
}

// ૫. કાર્યરત સમિતિઓ લોડ કરવી
async function loadFrontendActiveCommittees() {
    const container = document.getElementById("frontend-active-committees-list");
    if (!container) return;
    try {
        const snap = await getDocs(collection(db, "panchayats", panchayatId, "active_committees"));
        container.innerHTML = "";
        if (snap.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500">હાલ કોઈ કાર્યરત સમિતિ નથી.</p>`;
            return;
        }
        snap.forEach(d => {
            const item = d.data();
            container.innerHTML += `
                <div class="bg-white p-3 rounded-xl border shadow-sm">
                    <h4 class="font-bold text-gray-800 text-sm">${item.committeeName}</h4>
                    <p class="text-xs text-gray-600 mt-1">${item.details || ''}</p>
                </div>
            `;
        });
    } catch (err) {
        console.error("Active Committees Error:", err);
    }
}

// ૬. સમય પત્રક (Schedule)
async function loadFrontendSchedule() {
    const container = document.getElementById("frontend-schedule-list");
    if (!container) return;

    try {
        const snap = await getDocs(collection(db, "panchayats", panchayatId, "panchayat_schedule"));
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<p class='text-center text-gray-500 py-4 text-sm'>કોઈ સમયપત્રક ઉપલબ્ધ નથી.</p>";
            return;
        }

        snap.forEach(docSnap => {
            const item = docSnap.data();
            container.innerHTML += `
                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                    <h4 class="font-bold text-gray-900 text-base">${item.name || '-'}</h4>
                    <span class="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">${item.designation || '-'}</span>
                    <div class="text-xs text-gray-600 space-y-1 border-t pt-2">
                        <div><b>⏰ સમય:</b> ${item.timing || '-'}</div>
                        <div><b>📅 દિવસો:</b> ${item.days || '-'}</div>
                        ${item.note ? `<div class="text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1"><b>📌 નોંધ:</b> ${item.note}</div>` : ''}
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Schedule Error:", err);
    }
}

// ૭. ફરિયાદ સેક્શન ઓન/ઓફ ચેક કરીને સબમિટ કરવું
async function setupComplaintSection() {
    const form = document.getElementById("complaint-form");
    const container = document.getElementById("complaint-section-container");
    
    try {
        const configSnap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "complaint_config"));
        const isEnabled = !configSnap.exists() || configSnap.data().isEnabled !== false;

        if (!isEnabled) {
            if (container) {
                container.innerHTML = `
                    <div class="bg-amber-50 border border-amber-300 p-6 rounded-2xl text-center space-y-2">
                        <i class="fa-solid fa-triangle-exclamation text-3xl text-amber-600"></i>
                        <h3 class="font-bold text-amber-900 text-base">ફરિયાદ નિવારણ સેવાનો પ્રવાહ હાલ બંધ છે</h3>
                        <p class="text-xs text-amber-700">પંચાયત વહીવટી તંત્ર દ્વારા હાલમાં આ સુવિધા અસ્થાયી રૂપે બંધ રાખવામાં આવી છે.</p>
                    </div>`;
            }
            return;
        }
    } catch (err) {
        console.error("Complaint Config Error:", err);
    }

    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
            const token = "CMP-" + Math.floor(100000 + Math.random() * 900000);
            await addDoc(collection(db, "panchayats", panchayatId, "complaints"), {
                token: token,
                name: document.getElementById("c-name").value,
                mobile: document.getElementById("c-mobile").value,
                faliya: document.getElementById("c-faliya").value,
                house: document.getElementById("c-house").value,
                type: document.getElementById("c-type").value,
                msg: document.getElementById("c-msg").value,
                status: "ફરિયાદ પેન્ડિંગ રાખવામા આવેલ છે",
                createdAt: new Date(),
                date: new Date().toLocaleDateString('gu-IN')
            });
            alert(`તમારી ફરિયાદ સફળતાપૂર્વક નોંધાઈ ગઈ છે!\nતમારો ટોકન નંબર છે: ${token}`);
            e.target.reset();
        } catch (err) {
            alert("ભૂલ આવી: " + err.message);
        }
    });
}

// ૮. ફોટો ગેલેરી અને ઓટો સ્ક્રોલ
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
}

// ૯. ટેક્સ લિંક અને કસ્ટમ બટન્સ
async function setupTaxLink() {
    const taxBtn = document.getElementById("pay-tax-btn");
    if (!taxBtn) return;
    try {
        const docSnap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "tax_payment"));
        if (docSnap.exists() && docSnap.data().url) {
            taxBtn.href = docSnap.data().url;
            taxBtn.target = "_blank";
        }
    } catch (err) { console.error(err); }
}

async function loadCustomButtons() {
    const container = document.getElementById("custom-buttons-container");
    if (!container) return;
    try {
        const snap = await getDocs(collection(db, "panchayats", panchayatId, "custom_pages"));
        container.innerHTML = "";
        snap.forEach(docSnap => {
            const data = docSnap.data();
            container.innerHTML += `
                <a href="custom-page.html?id=${docSnap.id}&p=${panchayatId}" class="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold p-3 rounded-xl shadow text-xs text-center flex flex-col items-center justify-center gap-1">
                    <i class="fa-solid fa-link"></i>
                    <span>${data.buttonTitle}</span>
                </a>
            `;
        });
    } catch (err) { console.error(err); }
}

// 🚀 મુખ્ય ઇનિશિયલાઈઝેશન (જ્યારે પણ પેજ રિલોડ થશે કે પાછા આવશો ત્યારે ડેટા તરત લોડ થશે)
async function initApp() {
    const isAllowed = await checkSystemAccess();
    if (!isAllowed) return;

    loadSettings();
    loadPosts();
    loadFrontendNotices();
    loadFrontendStaffAndCommittee();
    loadFrontendActiveCommittees();
    loadFrontendSchedule();
    setupComplaintSection();
    displayGallery();
    setupTaxLink();
    loadCustomButtons();
}

// પેજ સંપૂર્ણ લોડ થાય એટલે ડેટા ફેચ કરવો
document.addEventListener("DOMContentLoaded", initApp);
initApp();
