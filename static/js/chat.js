/* ==========================================================================
   AI-Solutions - Virtual Assistant Widget Logic
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const chatWidget = document.getElementById("chat-widget");
    const chatTrigger = document.querySelector(".chat-trigger");
    const chatBox = document.querySelector(".chat-box");
    const chatClose = document.querySelector(".chat-close");
    const chatMessages = document.querySelector(".chat-messages");
    const chatInput = document.querySelector(".chat-input");
    const chatSend = document.querySelector(".chat-send");
    const chatChips = document.querySelector(".chat-chips");

    let isGreeted = false;

    // Toggle Chat Window
    const toggleChat = () => {
        chatBox.classList.toggle("active");
        if (chatBox.classList.contains("active")) {
            chatInput.focus();
            if (!isGreeted) {
                setTimeout(sendGreeting, 500);
                isGreeted = true;
            }
        }
    };

    chatTrigger.addEventListener("click", toggleChat);
    chatClose.addEventListener("click", toggleChat);

    // Append Chat Bubble
    const appendMessage = (sender, text) => {
        const bubble = document.createElement("div");
        bubble.classList.add("chat-bubble", sender);
        bubble.innerHTML = text; // HTML enabled for rich responses
        chatMessages.appendChild(bubble);
        
        // Auto scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    // Show/Hide Typing Indicator
    const showTypingIndicator = () => {
        const indicator = document.createElement("div");
        indicator.classList.add("chat-bubble", "bot", "typing-indicator-wrapper");
        indicator.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        chatMessages.appendChild(indicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return indicator;
    };

    // Initial Greet Message
    const sendGreeting = () => {
        const greeting = "Hello! I am your AI-Solutions Virtual Assistant. I am here to help you learn about our AI services, projects, pricing, and customer feedback. How can I help you today?";
        const indicator = showTypingIndicator();
        setTimeout(() => {
            indicator.remove();
            appendMessage("bot", greeting);
        }, 1000);
    };

    // Call API Chat Endpoint
    const fetchBotResponse = async (userMessage) => {
        const indicator = showTypingIndicator();
        
        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message: userMessage })
            });

            if (!response.ok) {
                throw new Error("Server communication issue");
            }

            const data = await response.json();
            
            // Introduce a natural delay for the bot response
            setTimeout(() => {
                indicator.remove();
                appendMessage("bot", data.response);
            }, 800);

        } catch (error) {
            console.error("Chat Error:", error);
            setTimeout(() => {
                indicator.remove();
                appendMessage("bot", "Oops! I encountered an error communicating with my neural network. Please check your connection or fill out our contact form for human support.");
            }, 800);
        }
    };

    // Handle Sending Message
    const handleSend = () => {
        const text = chatInput.value.trim();
        if (!text) return;

        appendMessage("user", text);
        chatInput.value = "";
        
        fetchBotResponse(text);
    };

    // Event Listeners
    chatSend.addEventListener("click", handleSend);
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            handleSend();
        }
    });

    // Quick Reply Chip Clicks
    chatChips.addEventListener("click", (e) => {
        if (e.target.classList.contains("chat-chip")) {
            const queryText = e.target.getAttribute("data-query");
            appendMessage("user", e.target.textContent);
            fetchBotResponse(queryText);
        }
    });
});
