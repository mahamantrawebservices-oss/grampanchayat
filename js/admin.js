import { db, storage, auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, setDoc, getDoc, deleteDoc, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Check Authentication
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login-modal")?.classList.add("hidden");
        document.getElementById("admin-dashboard")?.classList.remove("hidden");
        loadAdminComplaints();
        loadAdminGallery();
        loadAdminMeta();               // મુદત અને નોંધ બોક્સમાં લોડ કરશે
        loadAdminStaffAndCommittee();  // કમિટી સભ્યો અને સ્ટાફની યાદી લોડ કરશે
    } else {
        document.getElementById("login-modal")?.classList.remove("hidden");
        document.getElementById("admin-dashboard")?.classList.add("hidden");
    }
});

// Admin Login
document.getElementById("admin-login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const pass = document.getElementById("login-password").value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("લોગિન નિષ્ફળ: " + err.message));
});

// Logout
document.getElementById("logout-btn")?.addEventListener("click", () => signOut(auth));

// Save Customization
document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("set-gp-name").value;
    const tagline = document.getElementById("set-gp-tagline").value;

    await setDoc(doc(db, "settings", "general"), {
        ...(name && { name }),
        ...(tagline && { tagline })
    }, { merge: true });

    alert("સેટિંગ્સ સફળતાપૂર્વક સેવ થઈ ગયા!");
});

// Add Post/Notice
document.getElementById("post-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "posts"), {
        type: document.getElementById("post-type").value,
        title: document.getElementById("post-title").value,
        desc: document.getElementById("post-desc").value,
        createdAt: new Date()
    });
    alert("પોસ્ટ ઉમેરાઈ ગઈ!");
    e.target.reset();
});



// Blogger ફોટો ગેલેરી સેવ કરવી
document.getElementById("gallery-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("img-title").value;
    const url = document.getElementById("img-url").value;

    await addDoc(collection(db, "gallery"), {
        title: title,
        imageUrl: url,
        createdAt: new Date()
    });

    alert("ફોટો ગેલેરીમાં ઉમેરાઈ ગયો!");
    e.target.reset();
    loadAdminGallery();
});

// ગેલેરી લિસ્ટ લોડ કરવું અને ડિલીટ કરવું
async function loadAdminGallery() {
    const snap = await getDocs(collection(db, "gallery"));
    const container = document.getElementById("admin-gallery-list");
    if (!container) return;
    
    container.innerHTML = "";
    if (snap.empty) {
        container.innerHTML = "<p class='text-xs text-gray-500'>કોઈ ફોટો મળેલો નથી.</p>";
        return;
    }

    snap.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id;
        container.innerHTML += `
            <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm">
                <div class="flex items-center gap-2 overflow-hidden">
                    <img src="${item.imageUrl}" class="w-8 h-8 object-cover rounded flex-shrink-0">
                    <span class="text-xs font-semibold text-gray-700 truncate">${item.title}</span>
                </div>
                <button data-id="${id}" class="delete-gallery-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded transition flex-shrink-0">
                    ડિલીટ
                </button>
            </div>
        `;
    });

    document.querySelectorAll(".delete-gallery-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const docId = e.target.getAttribute("data-id");
            if (confirm("શું તમે આ ફોટો ગેલેરીમાંથી કાઢી નાખવા માંગો છો?")) {
                await deleteDoc(doc(db, "gallery", docId));
                alert("ફોટો ડિલીટ થઈ ગયો છે.");
                loadAdminGallery();
            }
        });
    });
}

// ૧. વિગત મેનેજર માટે Quill Word Editor
var menuQuill = new Quill('#menu-editor-container', {
    theme: 'snow',
    modules: {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ 'indent': '-1'}, { 'indent': '+1' }], // 👈 (+1 સ્પેસ આપશે)
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['clean']
        ]
    }
});

// ૨. નવું મેનૂ ઉમેરવું તથા જૂનું મેનૂ એડિટ (અપડેટ) કરવું
document.getElementById("add-menu-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("edit-menu-id").value;
    const title = document.getElementById("menu-title").value;
    const content = menuQuill.root.innerHTML;

    if (editId) {
        // ૧. જો એડિટ મોડ હોય તો અપડેટ કરશે
        await setDoc(doc(db, "village_details", editId), {
            title: title,
            content: content,
            updatedAt: new Date()
        }, { merge: true });

        alert("મેનૂ સફળતાપૂર્વક અપડેટ થઈ ગયું!");
    } else {
        // ૨. નવું મેનૂ એડ કરશે
        await addDoc(collection(db, "village_details"), {
            title: title,
            content: content,
            isShow: true,
            createdAt: new Date()
        });

        alert("નવું મેનૂ સફળતાપૂર્વક ઉમેરાઈ ગયું!");
    }

    resetMenuForm();
    loadAdminMenuList();
});

// ફોર્મ રીસેટ કરવા માટેનું ફંક્શન
function resetMenuForm() {
    document.getElementById("add-menu-form").reset();
    document.getElementById("edit-menu-id").value = "";
    menuQuill.root.innerHTML = "";
    document.getElementById("save-menu-btn").innerText = "મેનૂ સેવ કરો";
    document.getElementById("cancel-edit-btn").classList.add("hidden");
}

// કેન્સલ બટન પર કિલક કરવાથી એડિટ મોડ બંધ થશે
document.getElementById("cancel-edit-btn")?.addEventListener("click", resetMenuForm);

// ૩. એડમિન લિસ્ટ લોડ કરવું (Edit, Show/Hide & Delete સાથે)
async function loadAdminMenuList() {
    const snap = await getDocs(collection(db, "village_details"));
    const container = document.getElementById("admin-menu-list");
    if (!container) return;

    container.innerHTML = "";
    if (snap.empty) {
        container.innerHTML = "<p class='text-xs text-gray-500'>કોઈ મેનૂ મળે લ નથી.</p>";
        return;
    }

    snap.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id;
        const isShow = item.isShow !== false;

        container.innerHTML += `
            <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm">
                <span class="text-xs font-semibold ${isShow ? 'text-gray-800' : 'text-gray-400 line-through'}">${item.title}</span>
                <div class="flex items-center gap-1.5">
                    <button data-id="${id}" class="edit-menu-btn bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-1 rounded">
                        એડિટ
                    </button>
                    <button data-id="${id}" data-status="${isShow}" class="toggle-show-btn text-[10px] px-2 py-1 rounded text-white ${isShow ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-500 hover:bg-gray-600'}">
                        ${isShow ? 'સંતાડો' : 'બતાવો'}
                    </button>
                    <button data-id="${id}" class="delete-menu-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded">
                        ડિલીટ
                    </button>
                </div>
            </div>
        `;
    });

    // ✏️ એડિટ બટન ઈવેન્ટ
    document.querySelectorAll(".edit-menu-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            const docSnap = await getDoc(doc(db, "village_details", id));
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                document.getElementById("edit-menu-id").value = id;
                document.getElementById("menu-title").value = data.title;
                menuQuill.root.innerHTML = data.content || "";
                
                document.getElementById("save-menu-btn").innerText = "અપડેટ કરો";
                document.getElementById("cancel-edit-btn").classList.remove("hidden");
                
                // સ્ક્રોલ કરીને ફોર્મ સુધી લઈ જશે
                document.getElementById("add-menu-form").scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // 👁️ Show/Hide ઈવેન્ટ
    document.querySelectorAll(".toggle-show-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            const currentStatus = e.target.getAttribute("data-status") === "true";
            await setDoc(doc(db, "village_details", id), { isShow: !currentStatus }, { merge: true });
            loadAdminMenuList();
        });
    });

    // 🗑️ ડિલીટ ઈવેન્ટ
    document.querySelectorAll(".delete-menu-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            if (confirm("શું તમે આ મેનૂ ડિલીટ કરવા માંગો છો?")) {
                await deleteDoc(doc(db, "village_details", id));
                loadAdminMenuList();
            }
        });
    });
}
// Check Auth માં લોડ કરવા માટે ઉમેરો
loadAdminMenuList();



// ==========================================
// ૧. ૬ મહિના જૂનો ડેટા ઓટો ડિલીટ (Async Safe)
// ==========================================
async function cleanOldComplaints() {
    try {
        const sixMonthsAgo = Timestamp.fromDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000));
        const q = query(collection(db, "complaints"), where("createdAt", "<", sixMonthsAgo));
        const snap = await getDocs(q);
        
        const deletePromises = snap.docs.map(d => deleteDoc(doc(db, "complaints", d.id)));
        await Promise.all(deletePromises);
    } catch (error) {
        console.error("Auto cleanup error:", error);
    }
}
cleanOldComplaints();

// Helper Function: તારીખ અને સમય ફોર્મેટ કરવા માટે
function formatDateTime(timestamp) {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('gu-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// ==========================================
// ૨. આવેલ ફરિયાદો અને સ્ટેટસ મેનેજર (તારીખ/સમય સાથે)
// ==========================================
async function loadAdminComplaints() {
    const filter = document.getElementById("admin-complaint-filter")?.value || "ALL";
    const snap = await getDocs(collection(db, "complaints"));
    const container = document.getElementById("admin-complaint-list");
    if(!container) return;

    container.innerHTML = "";
    snap.forEach(d => {
        const item = d.data();
        const isPending = item.status?.includes("પેન્ડિંગ") || item.status?.includes("ચાલ") || item.status?.includes("નથી");
        
        if (filter === "PENDING" && !isPending) return;

        const formattedDate = formatDateTime(item.createdAt);

        container.innerHTML += `
            <div class="bg-white p-3 border rounded shadow-sm space-y-2 text-xs mb-2">
                <div class="flex justify-between font-bold text-gray-800 border-b pb-1">
                    <span>ટોકન: <span class="text-amber-600">${item.token || 'N/A'}</span> (${item.name || ''} - ${item.mobile || ''})</span>
                    <span class="text-emerald-700">${item.type || ''}</span>
                </div>
                <p><b>તારીખ & સમય:</b> <span class="text-blue-600 font-semibold">${formattedDate}</span></p>
                <p><b>વિસ્તાર:</b> ${item.area || ''} | <b>વિગત:</b> ${item.details || ''}</p>
                <div class="flex flex-wrap items-center gap-2">
                    <label class="font-bold">સ્ટેટસ બદલો:</label>
                    <select data-id="${d.id}" class="update-status-select border p-1 rounded bg-amber-50">
                        <option value="${item.status}" selected>હાલનું: ${item.status}</option>
                        <option value="ફરિયાદ પર કામ ચાલી રહ્યું છે">ફરિયાદ પર કામ ચાલી રહ્યું છે</option>
                        <option value="ફરિયાદ નિવારણ થઈ ગયું છે">ફરિયાદ નિવારણ થઈ ગયું છે</option>
                        <option value="ફરિયાદ આ વિભાગની ના હોય દફતરે કરવામાં આવેલ છે">ફરિયાદ આ વિભાગની ના હોય દફતરે કરવામાં આવેલ છે</option>
                        <option value="ફરિયાદ પેન્ડિંગ રાખવામા આવેલ છે">ફરિયાદ પેન્ડિંગ રાખવામા આવેલ છે</option>
                        <option value="ફરિયાદ પર હાલ કામ થઈ શકે તેમ નથી">ફરિયાદ પર હાલ કામ થઈ શકે તેમ નથી</option>
                        <option value="ફરિયાદ અયોગ્ય હોય રદ કરવામાં આવેલ છે">ફરિયાદ અયોગ્ય હોય રદ કરવામાં આવેલ છે</option>
                    </select>
                </div>
            </div>
        `;
    });

    // સ્ટેટસ અપડેટ લિશનર
    document.querySelectorAll(".update-status-select").forEach(sel => {
        sel.addEventListener("change", async (e) => {
            const id = e.target.getAttribute("data-id");
            await setDoc(doc(db, "complaints", id), { status: e.target.value }, { merge: true });
            alert("સ્ટેટસ અપડેટ થઈ ગયું!");
            loadAdminComplaints();
        });
    });
}

document.getElementById("admin-complaint-filter")?.addEventListener("change", loadAdminComplaints);
loadAdminComplaints();



// ==========================================
// ૩. માસિક સિલેક્શન પ્રમાણે PDF રિપોર્ટ જનરેટર (FIXED)
// ==========================================
document.getElementById("download-pdf-btn")?.addEventListener("click", async () => {
    const selectedMonth = document.getElementById("report-month-select")?.value; // YYYY-MM
    if (!selectedMonth) {
        alert("મહેરબાની કરીને રિપોર્ટ માટે મહિનો સિલેક્ટ કરો!");
        return;
    }

    const [year, month] = selectedMonth.split("-");
    const dateObj = new Date(year, month - 1);
    
    const monthNames = ["જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન", "જુલાઈ", "ઓગસ્ટ", "સપ્ટેમ્બર", "ઓક્ટોબર", "નવેમ્બર", "ડિસેમ્બર"];
    const monthGujarati = monthNames[dateObj.getMonth()];

    const snap = await getDocs(collection(db, "complaints"));
    
    // ૧. ટેમ્પરરી કન્ટેનર બનાવો (ગુજરાતી ફોન્ટ સપોર્ટ સાથે)
    const reportContainer = document.createElement("div");
    reportContainer.id = "temp-pdf-container";
    reportContainer.style.width = "1000px"; // ફિક્સ્ડ પહોળાઈ આપવી જરૂરી છે
    reportContainer.style.padding = "20px";
    reportContainer.style.backgroundColor = "#ffffff";
    reportContainer.style.color = "#000000";
    reportContainer.style.fontFamily = "'Noto Sans Gujarati', 'Shruti', 'Gujarati', sans-serif";

    // ૨. હેડર અને ટેબલ સ્ટ્રક્ચર
    let reportHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1e3a8a; font-size: 20px; font-weight: bold; margin: 0;">
                માસિક ફરિયાદ રિપોર્ટ માહે : ${monthGujarati} - ${year}
            </h2>
        </div>
        <table border="1" style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; border: 1px solid #666;">
            <thead>
                <tr style="background-color: #e2e8f0; color: #000; font-weight: bold;">
                    <th style="padding: 8px; border: 1px solid #666;">ટોકન</th>
                    <th style="padding: 8px; border: 1px solid #666;">તારીખ & સમય</th>
                    <th style="padding: 8px; border: 1px solid #666;">નામ & મોબાઈલ</th>
                    <th style="padding: 8px; border: 1px solid #666;">પ્રકાર</th>
                    <th style="padding: 8px; border: 1px solid #666;">વિસ્તાર</th>
                    <th style="padding: 8px; border: 1px solid #666;">સ્ટેટસ</th>
                </tr>
            </thead>
            <tbody>
    `;

    let count = 0;
    snap.forEach(d => {
        const item = d.data();
        
        let itemDate = null;
        if (item.createdAt) {
            itemDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
        } else if (item.date) {
            itemDate = new Date(item.date);
        }

        if (!itemDate || isNaN(itemDate.getTime())) return;

        // માસિક ચેક
        if (itemDate.getFullYear() == year && (itemDate.getMonth() + 1) == month) {
            count++;
            reportHTML += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #666;">${item.token || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #666;">${formatDateTime(item.createdAt || item.date)}</td>
                    <td style="padding: 8px; border: 1px solid #666;"><b>${item.name || '-'}</b><br>(${item.mobile || '-'})</td>
                    <td style="padding: 8px; border: 1px solid #666;">${item.type || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #666;">${item.area || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #666;">${item.status || '-'}</td>
                </tr>
            `;
        }
    });

    reportHTML += `</tbody></table>`;

    if (count === 0) {
        alert("પસંદ કરેલ મહિના માટે કોઈ ફરિયાદો મળી નથી.");
        return;
    }

    reportContainer.innerHTML = reportHTML;
    document.body.appendChild(reportContainer);

    // ૩. html2pdf ઓપ્શન્સ (scale અને useCORS ઉમેર્યું જેથી ઈમેજ તરીકે પરફેક્ટ ટેક્સ્ટ રેન્ડર થાય)
    const opt = {
        margin:       0.3,
        filename:     `Complaint_Report_${monthGujarati}_${year}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            letterRendering: true
        },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    try {
        await html2pdf().set(opt).from(reportContainer).save();
    } catch (err) {
        console.error("PDF જનરેટ કરવામાં ભૂલ:", err);
        alert("PDF ડાઉનલોડ કરવામાં સમસ્યા આવી!");
    } finally {
        document.body.removeChild(reportContainer); // DOM સફાઈ
    }
});



// ==========================================
// ૨. કમિટી / સ્ટાફ લોજિક (Add, Edit, Delete & Load)
// ==========================================

// ૧. સેવ થયેલી મુદત અને નોંધ Admin માં લોડ કરવી
async function loadAdminMeta() {
    try {
        const snap = await getDoc(doc(db, "panchayat_meta", "staff_page"));
        if (snap.exists()) {
            const data = snap.data();
            if (document.getElementById("admin-term-input")) {
                document.getElementById("admin-term-input").value = data.term || "";
            }
            if (document.getElementById("admin-note-input")) {
                document.getElementById("admin-note-input").value = data.note || "";
            }
        }
    } catch (err) {
        console.error("Meta loading error:", err);
    }
}

// મુદત અને નોંધ સાચવવાની ઈવેન્ટ
document.getElementById("save-meta-btn")?.addEventListener("click", async () => {
    const term = document.getElementById("admin-term-input").value;
    const note = document.getElementById("admin-note-input").value;
    await setDoc(doc(db, "panchayat_meta", "staff_page"), { term, note }, { merge: true });
    alert("મુદત અને નોંધ સાચવી લેવાયેલ છે!");
});

// ૨. કમિટી સભ્યો અને સ્ટાફની યાદી એડમિન પેનલમાં લોડ કરવી
async function loadAdminStaffAndCommittee() {
    const committeeContainer = document.getElementById("admin-committee-list");
    const staffContainer = document.getElementById("admin-staff-list");

    // A. કમિટી સભ્યો લોડ કરો
    if (committeeContainer) {
        const committeeSnap = await getDocs(collection(db, "panchayat_committee"));
        committeeContainer.innerHTML = "";
        if (committeeSnap.empty) {
            committeeContainer.innerHTML = "<p class='text-xs text-gray-500'>કોઈ કમિટી સભ્ય મળેલો નથી.</p>";
        } else {
            committeeSnap.forEach(docSnap => {
                const item = docSnap.data();
                committeeContainer.innerHTML += `
                    <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-xs">
                        <div class="truncate mr-2">
                            <span class="font-bold text-gray-800">${item.name}</span> (${item.designation})
                            <br><span class="text-[10px] text-gray-500">વોર્ડ: ${item.ward || '-'} | મો: ${item.mobile}</span>
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0">
                            <button data-id="${docSnap.id}" data-col="panchayat_committee" class="edit-ms-btn bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-1 rounded">એડિટ</button>
                            <button data-id="${docSnap.id}" data-col="panchayat_committee" class="delete-ms-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded">ડિલીટ</button>
                        </div>
                    </div>
                `;
            });
        }
    }

    // B. સ્ટાફ કર્મચારીઓ લોડ કરો
    if (staffContainer) {
        const staffSnap = await getDocs(collection(db, "panchayat_staff"));
        staffContainer.innerHTML = "";
        if (staffSnap.empty) {
            staffContainer.innerHTML = "<p class='text-xs text-gray-500'>કોઈ સ્ટાફ મળેલો નથી.</p>";
        } else {
            staffSnap.forEach(docSnap => {
                const item = docSnap.data();
                staffContainer.innerHTML += `
                    <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-xs">
                        <div class="truncate mr-2">
                            <span class="font-bold text-gray-800">${item.name}</span> (${item.designation})
                            <br><span class="text-[10px] text-gray-500">મો: ${item.mobile}</span>
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0">
                            <button data-id="${docSnap.id}" data-col="panchayat_staff" class="edit-ms-btn bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-1 rounded">એડિટ</button>
                            <button data-id="${docSnap.id}" data-col="panchayat_staff" class="delete-ms-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded">ડિલીટ</button>
                        </div>
                    </div>
                `;
            });
        }
    }

    // 🗑️ ડિલીટ ઈવેન્ટ
    document.querySelectorAll(".delete-ms-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            const col = e.target.getAttribute("data-col");
            if (confirm("શું તમે આ સભ્ય/કર્મચારીને કાઢી નાખવા માંગો છો?")) {
                await deleteDoc(doc(db, col, id));
                alert("ડિલીટ થઈ ગયું છે.");
                loadAdminStaffAndCommittee();
            }
        });
    });

    // ✏️ એડિટ ઈવેન્ટ (ફોર્મમાં ડેટા પાછો લાવવો)
    document.querySelectorAll(".edit-ms-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            const col = e.target.getAttribute("data-col");
            const docSnap = await getDoc(doc(db, col, id));

            if (docSnap.exists()) {
                const data = docSnap.data();
                document.getElementById("ms-category").value = (col === 'panchayat_committee') ? 'committee' : 'staff';
                document.getElementById("ms-name").value = data.name || '';
                document.getElementById("ms-desig").value = data.designation || '';
                document.getElementById("ms-mobile").value = data.mobile || '';
                document.getElementById("ms-ward").value = data.ward || '';

                // એડિટ મોડ માટે Hidden Inputs સેટ કરવા
                let editInput = document.getElementById("edit-ms-id");
                if (!editInput) {
                    editInput = document.createElement("input");
                    editInput.type = "hidden";
                    editInput.id = "edit-ms-id";
                    document.getElementById("add-member-staff-form").appendChild(editInput);
                }
                editInput.value = id;

                let colInput = document.getElementById("edit-ms-col");
                if (!colInput) {
                    colInput = document.createElement("input");
                    colInput.type = "hidden";
                    colInput.id = "edit-ms-col";
                    document.getElementById("add-member-staff-form").appendChild(colInput);
                }
                colInput.value = col;

                const submitBtn = document.querySelector("#add-member-staff-form button[type='submit']");
                if (submitBtn) submitBtn.innerText = "અપડેટ કરો";

                document.getElementById("add-member-staff-form").scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ૩. સભ્ય / સ્ટાફ સબ્મિટ (ઉમેરવા અને અપડેટ કરવા માટે)
document.getElementById("add-member-staff-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("ms-category").value;
    const targetCol = type === 'committee' ? 'panchayat_committee' : 'panchayat_staff';
    
    const editId = document.getElementById("edit-ms-id")?.value;
    const oldCol = document.getElementById("edit-ms-col")?.value;

    const payload = {
        name: document.getElementById("ms-name").value,
        designation: document.getElementById("ms-desig").value,
        mobile: document.getElementById("ms-mobile").value,
        ward: document.getElementById("ms-ward").value || '',
        order: Date.now()
    };

    if (editId) {
        // જો Category બદલાઈ હોય તો જૂના Collection માંથી ડિલીટ કરીને નવામાં ઉમેરો
        if (oldCol && oldCol !== targetCol) {
            await deleteDoc(doc(db, oldCol, editId));
            await addDoc(collection(db, targetCol), payload);
        } else {
            await setDoc(doc(db, targetCol, editId), payload, { merge: true });
        }
        alert("વિગત અપડેટ થઈ ગઈ છે!");
    } else {
        await addDoc(collection(db, targetCol), payload);
        alert("સફળતાપૂર્વક ઉમેરાઈ ગયું!");
    }

    // Reset Form & Clear Edit States
    if (document.getElementById("edit-ms-id")) document.getElementById("edit-ms-id").value = "";
    if (document.getElementById("edit-ms-col")) document.getElementById("edit-ms-col").value = "";
    
    const submitBtn = document.querySelector("#add-member-staff-form button[type='submit']");
    if (submitBtn) submitBtn.innerText = "સભ્ય/કર્મચારી ઉમેરો";

    e.target.reset();
    loadAdminStaffAndCommittee();
});




// ==========================================
// ૩. સમય પત્રક લોજિક
// ==========================================
document.getElementById("add-timetable-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "officer_timetable"), {
        name: document.getElementById("tt-name").value,
        designation: document.getElementById("tt-desig").value,
        mobile: document.getElementById("tt-mobile").value,
        days: document.getElementById("tt-days").value,
        timing: document.getElementById("tt-timing").value,
        villages: document.getElementById("tt-villages").value
    });
    alert("સમય પત્રક ઉમેરાઈ ગયું!");
    e.target.reset();
});

// ==========================================
// ૪. કાર્યરત સમિતિઓ લોજિક
// ==========================================
document.getElementById("add-committee-group-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("cg-title").value;
    const rawMembers = document.getElementById("cg-members-raw").value.split("\n");

    const members = rawMembers.map(row => {
        const parts = row.split(",");
        return {
            name: parts[0]?.trim() || '',
            originalDesignation: parts[1]?.trim() || '',
            committeeRole: parts[2]?.trim() || ''
        };
    }).filter(m => m.name !== '');

    await addDoc(collection(db, "active_committees"), {
        committeeName: title,
        members: members
    });
    alert("નવી સમિતિ ઉમેરાઈ ગઈ!");
    e.target.reset();
});

loadAdminComplaints();
