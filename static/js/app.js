/* ==========================================================================
   AI-Solutions - Main Client Portal Interactions
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Navigation Scrolled State
    const header = document.querySelector("header");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    });

    // 2. Mobile Menu Toggle
    const hamburger = document.querySelector(".hamburger");
    const nav = document.querySelector("nav");
    
    hamburger.addEventListener("click", () => {
        nav.classList.toggle("active");
        const icon = hamburger.querySelector("i");
        if (nav.classList.contains("active")) {
            icon.classList.remove("fa-bars");
            icon.classList.add("fa-xmark");
        } else {
            icon.classList.remove("fa-xmark");
            icon.classList.add("fa-bars");
        }
    });

    // Close menu on link click
    document.querySelectorAll("nav a").forEach(link => {
        link.addEventListener("click", () => {
            nav.classList.remove("active");
            const icon = hamburger.querySelector("i");
            if (icon) {
                icon.classList.remove("fa-xmark");
                icon.classList.add("fa-bars");
            }
        });
    });

    // 3. Scroll Reveal Animations (Intersection Observer)
    const reveals = document.querySelectorAll(".reveal");
    const revealOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    reveals.forEach(el => revealOnScroll.observe(el));

    // 4. Testimonial Slider & Approved Reviews Loader
    const sliderTrack = document.querySelector(".slider-track");
    const dotsContainer = document.querySelector(".slider-dots");
    const prevBtn = document.querySelector(".slider-prev");
    const nextBtn = document.querySelector(".slider-next");
    
    let slides = [];
    let currentSlideIndex = 0;
    let slideTimer;

    const renderStars = (rating) => {
        let starHTML = "";
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                starHTML += `<i class="fa-solid fa-star"></i>`;
            } else {
                starHTML += `<i class="fa-regular fa-star"></i>`;
            }
        }
        return starHTML;
    };

    const updateSliderPosition = () => {
        if (slides.length === 0) return;
        sliderTrack.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
        
        // Update dots state
        document.querySelectorAll(".dot").forEach((dot, index) => {
            if (index === currentSlideIndex) {
                dot.classList.add("active");
            } else {
                dot.classList.remove("active");
            }
        });
    };

    const startSlideShow = () => {
        stopSlideShow();
        slideTimer = setInterval(() => {
            if (slides.length > 0) {
                currentSlideIndex = (currentSlideIndex + 1) % slides.length;
                updateSliderPosition();
            }
        }, 5000);
    };

    const stopSlideShow = () => {
        if (slideTimer) clearInterval(slideTimer);
    };

    const loadReviews = async () => {
        try {
            const response = await fetch("/api/reviews");
            if (!response.ok) throw new Error("Could not load reviews");
            const reviews = await response.json();

            if (reviews.length === 0) {
                sliderTrack.innerHTML = `<div class="slide"><p class="testimonial-text">No reviews published yet. Be the first to share your experience!</p></div>`;
                return;
            }

            sliderTrack.innerHTML = "";
            dotsContainer.innerHTML = "";

            reviews.forEach((review, index) => {
                // Create Slide elements
                const slide = document.createElement("div");
                slide.classList.add("slide");
                slide.innerHTML = `
                    <div class="stars">${renderStars(review.rating)}</div>
                    <p class="testimonial-text">"${review.feedback}"</p>
                    <div class="client-info">
                        <h4>${review.name}</h4>
                        <p>${review.job_title || "Enterprise Partner"}</p>
                    </div>
                `;
                sliderTrack.appendChild(slide);

                // Create navigation dots
                const dot = document.createElement("div");
                dot.classList.add("dot");
                if (index === 0) dot.classList.add("active");
                dot.addEventListener("click", () => {
                    currentSlideIndex = index;
                    updateSliderPosition();
                    startSlideShow();
                });
                dotsContainer.appendChild(dot);
            });

            slides = document.querySelectorAll(".slide");
            currentSlideIndex = 0;
            updateSliderPosition();
            startSlideShow();

        } catch (error) {
            console.error("Reviews load error:", error);
            sliderTrack.innerHTML = `<div class="slide"><p class="testimonial-text">Error loading client feedback database records.</p></div>`;
        }
    };

    if (sliderTrack) {
        loadReviews();
        
        prevBtn.addEventListener("click", () => {
            if (slides.length > 0) {
                currentSlideIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
                updateSliderPosition();
                startSlideShow();
            }
        });

        nextBtn.addEventListener("click", () => {
            if (slides.length > 0) {
                currentSlideIndex = (currentSlideIndex + 1) % slides.length;
                updateSliderPosition();
                startSlideShow();
            }
        });
    }

    // 5. Interactive Star Rating Selector in Review Form
    const starSelector = document.getElementById("star-selector");
    let selectedRating = 5;

    if (starSelector) {
        const stars = starSelector.querySelectorAll("i");
        
        stars.forEach(star => {
            const val = parseInt(star.getAttribute("data-value"));
            
            // Hover logic
            star.addEventListener("mouseover", () => {
                stars.forEach((s, idx) => {
                    if (idx < val) {
                        s.classList.add("hover");
                        s.classList.remove("fa-regular");
                        s.classList.add("fa-solid");
                    } else {
                        s.classList.remove("hover");
                        if (idx >= selectedRating) {
                            s.classList.add("fa-regular");
                            s.classList.remove("fa-solid");
                        }
                    }
                });
            });

            // Click select logic
            star.addEventListener("click", () => {
                selectedRating = val;
                stars.forEach((s, idx) => {
                    if (idx < val) {
                        s.classList.add("selected");
                        s.classList.remove("fa-regular");
                        s.classList.add("fa-solid");
                    } else {
                        s.classList.remove("selected");
                        s.classList.add("fa-regular");
                        s.classList.remove("fa-solid");
                    }
                });
            });
        });

        // Mouse out logic
        starSelector.addEventListener("mouseleave", () => {
            stars.forEach((s, idx) => {
                s.classList.remove("hover");
                if (idx < selectedRating) {
                    s.classList.remove("fa-regular");
                    s.classList.add("fa-solid");
                    s.classList.add("selected");
                } else {
                    s.classList.add("fa-regular");
                    s.classList.remove("fa-solid");
                    s.classList.remove("selected");
                }
            });
        });
    }

    // 6. Contact Form Submission
    const contactForm = document.getElementById("contact-form");
    const contactAlert = document.getElementById("contact-alert");

    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            contactAlert.style.display = "none";
            contactAlert.className = "alert";

            // Gather values
            const formData = {
                name: document.getElementById("name").value.trim(),
                email: document.getElementById("email").value.trim(),
                phone: document.getElementById("phone").value.trim() || null,
                company_name: document.getElementById("company").value.trim() || null,
                country: document.getElementById("country").value.trim() || null,
                job_title: document.getElementById("job_title").value.trim() || null,
                job_details: document.getElementById("message").value.trim()
            };

            // Call FastAPI submit endpoint
            try {
                const response = await fetch("/api/inquire", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    contactAlert.textContent = result.message;
                    contactAlert.classList.add("alert-success");
                    contactAlert.style.display = "block";
                    contactForm.reset();
                } else {
                    contactAlert.textContent = result.detail || "Validation check failed. Please check form inputs.";
                    contactAlert.classList.add("alert-error");
                    contactAlert.style.display = "block";
                }
            } catch (error) {
                console.error("Submit Error:", error);
                contactAlert.textContent = "Network failure or server is offline. Please try again.";
                contactAlert.classList.add("alert-error");
                contactAlert.style.display = "block";
            }
        });
    }

    // 7. Write a Review Form Submission
    const reviewForm = document.getElementById("write-review-form");
    const reviewAlert = document.getElementById("review-alert");

    if (reviewForm) {
        reviewForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            reviewAlert.style.display = "none";
            reviewAlert.className = "alert";

            const reviewData = {
                name: document.getElementById("rev-name").value.trim(),
                job_title: document.getElementById("rev-title").value.trim() || null,
                rating: selectedRating,
                feedback: document.getElementById("rev-feedback").value.trim()
            };

            try {
                const response = await fetch("/api/reviews", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(reviewData)
                });

                const result = await response.json();

                if (response.ok) {
                    reviewAlert.textContent = result.message;
                    reviewAlert.classList.add("alert-success");
                    reviewAlert.style.display = "block";
                    reviewForm.reset();
                    
                    // Reset selected stars back to 5
                    selectedRating = 5;
                    const stars = starSelector.querySelectorAll("i");
                    stars.forEach(s => {
                        s.classList.remove("fa-regular");
                        s.classList.add("fa-solid");
                        s.classList.add("selected");
                    });
                } else {
                    reviewAlert.textContent = result.detail || "Verification check failed. Please ensure feedback details are provided.";
                    reviewAlert.classList.add("alert-error");
                    reviewAlert.style.display = "block";
                }
            } catch (error) {
                console.error("Submit Review Error:", error);
                reviewAlert.textContent = "Network failure or server offline. Please retry.";
                reviewAlert.classList.add("alert-error");
                reviewAlert.style.display = "block";
            }
        });
    }
});
