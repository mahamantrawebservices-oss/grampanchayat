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
    const docSnap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "general"));
    if (docSnap.exists()) {
        const data = docSnap.data();
        if(data.name && document.getElementById("gp-name")) document.getElementById("gp-name").innerText = data.name;
        if(data.tagline && document.getElementById("gp-tagline")) document.getElementById("gp-tagline").innerText = data.tagline;
        if(data.name && document.getElementById("banner-gp-name")) document.getElementById("banner-gp-name").innerText = data.name;
        if(data.tagline && document.getElementById("banner-gp-tagline")) document.getElementById("banner-gp-tagline").innerText = data.tagline;
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
    });
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
    });
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
    } catch (err) { console.error(err); }
}

// 🏛️ સમયપત્રક લોડ કરવું
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
    } catch (err) { console.error(err); }
}

// 🛡️ એડમિન પેનલના સેટિંગ મુજબ ફરિયાદ વિભાગ ચાલુ/બંધ (Hide/Show) ચેક કરવાનું ફંક્શન
async function setupComplaintSection() {
    try {
        const configSnap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "complaint_config"));
        const isEnabled = !configSnap.exists() || configSnap.data().isEnabled !== false;

        if (!isEnabled) {
            // જો મુખ્ય પેજ પર ફરિયાદ સેક્શન હોય તો બંધ નોટિસ બતાવવી
            const container = document.getElementById("complaint-section-container");
            if (container) {
                container.innerHTML = `
                    <div class="bg-amber-50 border border-amber-300 p-6 rounded-2xl text-center space-y-2 my-4">
                        <i class="fa-solid fa-triangle-exclamation text-3xl text-amber-600"></i>
                        <h3 class="font-bold text-amber-900 text-base">ફરિયાદ નિવારણ સેવાનો પ્રવાહ હાલ બંધ છે</h3>
                        <p class="text-xs text-amber-700">પંચાયત વહીવટી તંત્ર દ્વારા હાલમાં આ સુવિધા અસ્થાયી રૂપે બંધ રાખવામાં આવી છે.</p>
                    </div>`;
            }

            // જો યૂઝર સીધા complaint.html પર જાય તો તેને રોકવા માટે
            if (window.location.pathname.includes("complaint.html")) {
                document.querySelector("main").innerHTML = `
                    <div class="bg-amber-50 border border-amber-300 p-8 rounded-2xl text-center space-y-3 max-w-lg mx-auto mt-10">
                        <i class="fa-solid fa-ban text-4xl text-red-600"></i>
                        <h2 class="font-bold text-amber-900 text-lg">ફરિયાદ પોર્ટલ હાલ બંધ છે</h2>
                        <p class="text-xs text-amber-700">પંચાયત વહીવટી તંત્ર દ્વારા હાલમાં આ સેવા બંધ કરવામાં આવી છે.</p>
                        <a href="index.html?id=${panchayatId}" class="inline-block bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs mt-2">← મુખ્ય પૃષ્ઠ પર જાઓ</a>
                    </div>`;
            }
        }
    } catch (err) {
        console.error("Complaint Config Check Error:", err);
    }
}

// 🛡️ ફરિયાદ વિભાગ ચાલુ/બંધ સ્ટેટસ ચેક કરવા માટેનું પક્કું ફંક્શન
async function setupComplaintSection() {
    try {
        const configSnap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "complaint_config"));
        
        let isEnabled = true; // ડિફોલ્ટ ચાલુ રાખવું
        if (configSnap.exists()) {
            const data = configSnap.data();
            // જો એડમિન પેનલથી explicitly false કર્યું હોય તો જ બંધ કરવું
            if (data.isEnabled === false || data.isEnabled === "false") {
                isEnabled = false;
            }
        }

        // જો બંધ કરેલું હોય તો ફ્રન્ટએન્ડ પર બતાવો
        if (!isEnabled) {
            // જો મુખ્ય પેજ પર ફરિયાદ સેક્શન કે કન્ટેનર હોય
            const container = document.getElementById("complaint-section-container");
            if (container) {
                container.innerHTML = `
                    <div class="bg-amber-50 border border-amber-300 p-6 rounded-2xl text-center space-y-2 my-4">
                        <i class="fa-solid fa-triangle-exclamation text-3xl text-amber-600"></i>
                        <h3 class="font-bold text-amber-900 text-base">ફરિયાદ નિવારણ સેવાનો પ્રવાહ હાલ બંધ છે</h3>
                        <p class="text-xs text-amber-700">પંચાયત વહીવટી તંત્ર દ્વારા હાલમાં આ સુવિધા અસ્થાયી રૂપે બંધ રાખવામાં આવી છે.</p>
                    </div>`;
            }

            // જો કોઈ યૂઝર સીધા complaint.html પર હોય તો ત્યાં પણ મેસેજ બતાવવો
            if (window.location.pathname.includes("complaint.html")) {
                const mainEl = document.querySelector("main");
                if (mainEl) {
                    mainEl.innerHTML = `
                        <div class="bg-amber-50 border border-amber-300 p-8 rounded-2xl text-center space-y-3 max-w-lg mx-auto mt-10">
                            <i class="fa-solid fa-ban text-4xl text-red-600"></i>
                            <h2 class="font-bold text-amber-900 text-lg">ફરિયાદ પોર્ટલ હાલ બંધ છે</h2>
                            <p class="text-xs text-amber-700">પંચાયત વહીવટી તંત્ર દ્વારા હાલમાં આ સેવા બંધ કરવામાં આવી છે.</p>
                            <a href="index.html?id=${panchayatId}" class="inline-block bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs mt-2">← મુખ્ય પૃષ્ઠ પર જાઓ</a>
                        </div>`;
                }
            }
        }
    } catch (err) {
        console.error("Complaint Config Check Error:", err);
    }
}


// 🚀 મુખ્ય ઇનિશિયલાઈઝેશન
async function initApp() {
    const isAllowed = await checkSystemAccess();
    if (!isAllowed) return;

    loadSettings();
    loadPosts();
    loadFrontendNotices();
    loadFrontendStaffAndCommittee();
    loadFrontendSchedule();
    await setupComplaintSection(); // અહિં await સાથે રાખવું જેથી ડેટા ફેચ થાય પછી જ ચેક થાય
    updateDynamicLinks();
}

document.addEventListener("DOMContentLoaded", initApp);
initApp();
