/* ==========================================================================
   AI-Solutions - Administrative Dashboard Control
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // Auth Token & Dashboard Panels
    const loginSection = document.getElementById("admin-login-section");
    const dashboardSection = document.getElementById("admin-dashboard-section");
    
    const loginForm = document.getElementById("admin-login-form");
    const loginAlert = document.getElementById("login-error-alert");
    const logoutBtn = document.getElementById("admin-logout-btn");
    
    // Tab switching
    const navItems = document.querySelectorAll(".admin-nav-item");
    const panels = document.querySelectorAll(".view-panel");

    // Modal elements
    const detailModal = document.getElementById("detail-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");

    // Data lists
    let inquiriesData = [];
    let reviewsData = [];
    let countryChartInstance = null;

    // 1. Authorization Verification State
    const checkAuth = () => {
        const token = sessionStorage.getItem("admin_token");
        if (token) {
            loginSection.style.display = "none";
            dashboardSection.classList.remove("view-panel");
            dashboardSection.classList.add("admin-dashboard");
            dashboardSection.style.display = "flex";
            
            // Set active admin text
            const adminUser = sessionStorage.getItem("admin_user") || "Administrator";
            document.getElementById("admin-user-display").textContent = adminUser;
            
            // Initialize Dashboard content
            initDashboard();
        } else {
            dashboardSection.style.display = "none";
            dashboardSection.classList.remove("admin-dashboard");
            loginSection.style.display = "flex";
        }
    };

    // 2. Login Submit Handler
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            loginAlert.style.display = "none";

            const usernameInput = document.getElementById("username").value.trim();
            const passwordInput = document.getElementById("password").value;

            try {
                const response = await fetch("/api/admin/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: usernameInput, password: passwordInput })
                });

                const result = await response.json();

                if (response.ok) {
                    sessionStorage.setItem("admin_token", result.token);
                    sessionStorage.setItem("admin_user", result.username);
                    checkAuth();
                } else {
                    loginAlert.textContent = result.detail || "Authentication failed.";
                    loginAlert.style.display = "block";
                }
            } catch (err) {
                console.error("Login request issue:", err);
                loginAlert.textContent = "Unable to connect to the authentication server.";
                loginAlert.style.display = "block";
            }
        });
    }

    // 3. Logout action
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            sessionStorage.removeItem("admin_token");
            sessionStorage.removeItem("admin_user");
            checkAuth();
        });
    }

    // 4. Tab switching implementation
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetTab = item.getAttribute("data-tab");
            
            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");

            panels.forEach(panel => {
                if (panel.id === `${targetTab}-panel`) {
                    panel.classList.add("active");
                } else {
                    panel.classList.remove("active");
                }
            });

            // Trigger refreshes depending on panel
            if (targetTab === "dashboard") {
                loadStats();
            } else if (targetTab === "inquiries") {
                loadInquiries();
            } else if (targetTab === "reviews") {
                loadReviews();
            }
        });
    });

    // 5. Dashboard Initialization
    const initDashboard = () => {
        loadStats();
        loadInquiries();
        loadReviews();
    };

    const loadStats = async () => {
        const token = sessionStorage.getItem("admin_token");
        try {
            const res = await fetch("/api/admin/stats", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.status === 401) {
                sessionStorage.removeItem("admin_token");
                checkAuth();
                return;
            }
            const data = await res.json();
            
            // Populate KPI Cards
            document.getElementById("kpi-total-inquiries").textContent = data.total_inquiries;
            document.getElementById("kpi-new-inquiries").textContent = data.new_inquiries;
            document.getElementById("kpi-total-reviews").textContent = data.total_reviews;
            document.getElementById("kpi-pending-reviews").textContent = data.pending_reviews;
            
            // Build Charts
            renderCharts(data.country_stats);

        } catch (err) {
            console.error("Error loading KPI data:", err);
        }
    };

    // 6. Chart.js Graphs
    const renderCharts = (countryStats) => {
        const ctx = document.getElementById("country-chart").getContext("2d");
        
        if (countryChartInstance) {
            countryChartInstance.destroy();
        }

        const labels = countryStats.map(c => c.country || "Unknown");
        const counts = countryStats.map(c => c.count);

        if (labels.length === 0) {
            labels.push("No data");
            counts.push(0);
        }

        countryChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Inquiries count",
                    data: counts,
                    backgroundColor: [
                        "rgba(212, 175, 55, 0.75)",
                        "rgba(191, 149, 63, 0.75)",
                        "rgba(179, 135, 40, 0.75)",
                        "rgba(170, 119, 28, 0.75)",
                        "rgba(243, 229, 171, 0.75)"
                    ],
                    borderColor: [
                        "#d4af37",
                        "#bf953f",
                        "#b38728",
                        "#aa771c",
                        "#f3e5ab"
                    ],
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: "rgba(255, 255, 255, 0.05)"
                        },
                        ticks: {
                            color: "#a0a0b2",
                            font: { family: "Inter" }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: "#a0a0b2",
                            font: { family: "Inter" }
                        }
                    }
                }
            }
        });
    };

    // 7. Load Inquiries Datagrid
    const loadInquiries = async () => {
        const token = sessionStorage.getItem("admin_token");
        const tbody = document.getElementById("inquiries-tbody");
        if (!tbody) return;

        try {
            const res = await fetch("/api/admin/inquiries", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.status === 401) {
                sessionStorage.removeItem("admin_token");
                checkAuth();
                return;
            }
            
            inquiriesData = await res.json();
            renderInquiriesTable(inquiriesData);

        } catch (err) {
            console.error("Error loading inquiries database:", err);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e57373;">Failed to load inquiry logs.</td></tr>`;
        }
    };

    const renderInquiriesTable = (data) => {
        const tbody = document.getElementById("inquiries-tbody");
        tbody.innerHTML = "";

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No customer inquiries found.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const date = new Date(item.created_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
            });
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><b>${item.name}</b></td>
                <td>${item.email}</td>
                <td>${item.company_name || "-"}</td>
                <td>${item.country || "-"}</td>
                <td><span class="badge badge-${item.status}">${item.status.toUpperCase()}</span></td>
                <td>${date}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-view" title="View Details"><i class="fa-solid fa-eye"></i></button>
                        ${item.status === 'new' ? `<button class="action-btn btn-read" title="Mark as Read"><i class="fa-solid fa-check"></i></button>` : ''}
                        <button class="action-btn btn-delete" title="Delete Inquiry"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;

            // Row actions
            tr.querySelector(".btn-view").addEventListener("click", (e) => {
                e.stopPropagation();
                openDetailModal(item);
            });

            const readBtn = tr.querySelector(".btn-read");
            if (readBtn) {
                readBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    markAsRead(item.id);
                });
            }

            tr.querySelector(".btn-delete").addEventListener("click", (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete inquiry from ${item.name}?`)) {
                    deleteInquiry(item.id);
                }
            });

            // Make entire row double clickable to view details
            tr.addEventListener("dblclick", () => {
                openDetailModal(item);
            });

            tbody.appendChild(tr);
        });
    };

    // Search and filters
    const searchInq = document.getElementById("search-inquiries");
    if (searchInq) {
        searchInq.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().strip();
            const filtered = inquiriesData.filter(item => 
                item.name.toLowerCase().includes(query) ||
                item.email.toLowerCase().includes(query) ||
                (item.company_name && item.company_name.toLowerCase().includes(query)) ||
                (item.country && item.country.toLowerCase().includes(query)) ||
                (item.job_details && item.job_details.toLowerCase().includes(query))
            );
            renderInquiriesTable(filtered);
        });
    }

    // Inquiries Operations
    const markAsRead = async (id) => {
        const token = sessionStorage.getItem("admin_token");
        try {
            const res = await fetch(`/api/admin/inquiries/${id}/read`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                loadInquiries();
                loadStats();
            }
        } catch (err) {
            console.error("Error marking read status:", err);
        }
    };

    const deleteInquiry = async (id) => {
        const token = sessionStorage.getItem("admin_token");
        try {
            const res = await fetch(`/api/admin/inquiries/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                loadInquiries();
                loadStats();
            }
        } catch (err) {
            console.error("Error deleting inquiry:", err);
        }
    };

    // Modal Control
    const openDetailModal = (item) => {
        document.getElementById("modal-name").textContent = item.name;
        document.getElementById("modal-email").textContent = item.email;
        document.getElementById("modal-phone").textContent = item.phone || "-";
        document.getElementById("modal-company").textContent = item.company_name || "-";
        document.getElementById("modal-country").textContent = item.country || "-";
        document.getElementById("modal-title").textContent = item.job_title || "-";
        document.getElementById("modal-message").textContent = item.job_details;
        
        detailModal.classList.add("active");
        
        // Auto mark as read if it is new
        if (item.status === "new") {
            markAsRead(item.id);
        }
    };

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            detailModal.classList.remove("active");
        });
    }

    // Close modal on background click
    window.addEventListener("click", (e) => {
        if (e.target === detailModal) {
            detailModal.classList.remove("active");
        }
    });

    // 8. Load Reviews Moderate Datagrid
    const loadReviews = async () => {
        const token = sessionStorage.getItem("admin_token");
        const tbody = document.getElementById("reviews-tbody");
        if (!tbody) return;

        try {
            const res = await fetch("/api/admin/reviews", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.status === 401) {
                sessionStorage.removeItem("admin_token");
                checkAuth();
                return;
            }
            
            reviewsData = await res.json();
            renderReviewsTable(reviewsData);

        } catch (err) {
            console.error("Error loading reviews dashboard:", err);
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #e57373;">Failed to load client review requests.</td></tr>`;
        }
    };

    const renderReviewsTable = (data) => {
        const tbody = document.getElementById("reviews-tbody");
        tbody.innerHTML = "";

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No reviews submitted.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const date = new Date(item.created_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
            });
            
            // Build star HTML representation
            let starsHTML = "";
            for (let i = 1; i <= 5; i++) {
                if (i <= item.rating) {
                    starsHTML += `<span style="color:#d4af37">★</span>`;
                } else {
                    starsHTML += `<span style="color:rgba(255,255,255,0.15)">★</span>`;
                }
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><b>${item.name}</b></td>
                <td>${item.job_title || "-"}</td>
                <td>${starsHTML} (${item.rating}/5)</td>
                <td style="max-width: 250px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${item.feedback}">${item.feedback}</td>
                <td><span class="badge badge-${item.status}">${item.status.toUpperCase()}</span></td>
                <td>
                    <div class="action-buttons">
                        ${item.status === 'pending' ? `<button class="action-btn btn-approve" title="Approve & Publish"><i class="fa-solid fa-thumbs-up"></i></button>` : ''}
                        <button class="action-btn btn-delete" title="Delete Review"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;

            const approveBtn = tr.querySelector(".btn-approve");
            if (approveBtn) {
                approveBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    approveReview(item.id);
                });
            }

            tr.querySelector(".btn-delete").addEventListener("click", (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete review from ${item.name}?`)) {
                    deleteReview(item.id);
                }
            });

            tbody.appendChild(tr);
        });
    };

    const approveReview = async (id) => {
        const token = sessionStorage.getItem("admin_token");
        try {
            const res = await fetch(`/api/admin/reviews/${id}/approve`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                loadReviews();
                loadStats();
            }
        } catch (err) {
            console.error("Error approving review:", err);
        }
    };

    const deleteReview = async (id) => {
        const token = sessionStorage.getItem("admin_token");
        try {
            const res = await fetch(`/api/admin/reviews/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                loadReviews();
                loadStats();
            }
        } catch (err) {
            console.error("Error deleting review:", err);
        }
    };

    // 9. Export to CSV Utility
    const exportBtn = document.getElementById("export-csv-btn");
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            if (inquiriesData.length === 0) {
                alert("No inquiries log is currently loaded to export.");
                return;
            }

            // CSV headers
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "ID,Name,Email,Phone,Company,Country,Job Title,Status,Created At,Message\n";

            // Row building
            inquiriesData.forEach(item => {
                // Escape message double quotes
                const escapedMessage = (item.job_details || "").replace(/"/g, '""');
                
                const row = [
                    item.id,
                    `"${item.name}"`,
                    `"${item.email}"`,
                    `"${item.phone || ''}"`,
                    `"${item.company_name || ''}"`,
                    `"${item.country || ''}"`,
                    `"${item.job_title || ''}"`,
                    `"${item.status}"`,
                    `"${item.created_at}"`,
                    `"${escapedMessage}"`
                ].join(",");
                
                csvContent += row + "\n";
            });

            // Trigger browser download anchor link
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            
            const timestamp = new Date().toISOString().slice(0,10);
            link.setAttribute("download", `ai_solutions_inquiries_${timestamp}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Initialize Auth state on boot
    checkAuth();
});
