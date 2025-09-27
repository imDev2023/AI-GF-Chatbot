// User personalization data
let userPreferences = {
  name: "",
  hobbies: "",
  ageRange: "",
  chatPreferences: [],
};

// Create flying hearts
function createHearts() {
  const heartsContainer = document.createElement("div");
  heartsContainer.className = "hearts-container";
  document.body.appendChild(heartsContainer);

  for (let i = 0; i < 15; i++) {
    createHeart(heartsContainer);
  }
}

function createHeart(container) {
  const heart = document.createElement("div");
  heart.className = "heart";

  const size = Math.random() * 15 + 10;
  const left = Math.random() * 100;
  const animationDelay = Math.random() * 6;
  const duration = Math.random() * 4 + 4;

  heart.style.width = `${size}px`;
  heart.style.height = `${size}px`;
  heart.style.left = `${left}vw`;
  heart.style.top = `${Math.random() * 100}vh`;
  heart.style.animationDelay = `${animationDelay}s`;
  heart.style.animationDuration = `${duration}s`;

  const colors = [
    "#ff6b6b",
    "#ff8e8e",
    "#ffafbd",
    "#ffc3a0",
    "#a8e6cf",
    "#dcedc1",
    "#ffd3b6",
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];
  heart.style.background = color;

  container.appendChild(heart);
}

// Personalization Modal Handler
class PersonalizationModal {
  constructor() {
    this.modal = document.getElementById("personalizationModal");
    this.form = document.getElementById("personalizationForm");
    this.chatContainer = document.getElementById("chatContainer");
    this.chatTitle = document.getElementById("chatTitle");

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    this.form.addEventListener("submit", (e) => this.handleFormSubmit(e));
  }

  handleFormSubmit(e) {
    e.preventDefault();

    // Collect user preferences
    userPreferences = {
      name: document.getElementById("userName").value.trim(),
      hobbies: document.getElementById("userHobbies").value.trim(),
      ageRange: document.getElementById("userAge").value,
      chatPreferences: this.getSelectedPreferences(),
    };

    // Validate form
    if (!this.validateForm()) {
      return;
    }

    // Close modal and start chat
    this.closeModal();
    this.startChat();
  }

  getSelectedPreferences() {
    const checkboxes = document.querySelectorAll(
      'input[name="preferences"]:checked'
    );
    return Array.from(checkboxes).map((cb) => cb.value);
  }

  validateForm() {
    if (!userPreferences.name) {
      alert("Please enter the name you would like to be called.");
      return false;
    }
    if (!userPreferences.hobbies) {
      alert("Please share your hobbies and interests.");
      return false;
    }
    if (!userPreferences.ageRange) {
      alert("Please select your age range.");
      return false;
    }
    if (userPreferences.chatPreferences.length === 0) {
      alert("Please select at least one chatting preference.");
      return false;
    }
    return true;
  }

  closeModal() {
    this.modal.style.display = "none";
  }

  startChat() {
    this.chatContainer.style.display = "block";
    this.chatTitle.textContent = `💖 Chat with ${userPreferences.name} 💖`;

    // Initialize chat with user preferences
    new RomanticChat();

    // Show personalized welcome message
    this.showPersonalizedWelcome();
  }

  showPersonalizedWelcome() {
    const welcomeMessage = `
            <div class="welcome-message">
                <h3>Welcome, ${userPreferences.name}! 💖</h3>
                <p>I'm excited to chat with you! Here's what I know about you:</p>
                <div class="user-info-badge">Age: ${
                  userPreferences.ageRange
                }</div>
                <div class="user-info-badge">Hobbies: ${userPreferences.hobbies
                  .split(",")
                  .slice(0, 3)
                  .join(", ")}</div>
                <div class="user-info-badge">Preferences: ${userPreferences.chatPreferences.join(
                  ", "
                )}</div>
                <p style="margin-top: 15px; color: #666;">I'll keep this in mind while we chat! 😊</p>
            </div>
        `;

    const chatLog = document.getElementById("chatLog");
    chatLog.innerHTML = welcomeMessage;
  }
}

// Chat functionality with AI backend
class RomanticChat {
  constructor() {
    this.chatLog = document.getElementById("chatLog");
    this.userInput = document.getElementById("userInput");
    this.sendBtn = document.getElementById("sendBtn");
    this.isTyping = false;

    this.initializeEventListeners();
    setTimeout(() => this.showWelcomeMessage(), 1000);
  }

  initializeEventListeners() {
    this.sendBtn.addEventListener("click", () => this.sendMessage());
    this.userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.sendMessage();
      }
    });
  }

  async sendMessage() {
    const message = this.userInput.value.trim();
    if (message === "" || this.isTyping) return;

    this.addMessage(message, "user");
    this.userInput.value = "";
    this.showTypingIndicator();

    try {
      const response = await this.getAIResponse(message);
      this.removeTypingIndicator();
      this.addMessage(response, "bot");
    } catch (error) {
      this.removeTypingIndicator();
      this.addMessage(
        "Sorry, I'm having trouble connecting right now. Try again? 💔",
        "bot"
      );
      console.error("Error:", error);
    }
  }

  async getAIResponse(userMessage) {
    const requestData = {
        message: userMessage,
        userPreferences: userPreferences,
        conversationId: this.conversationId || 'default'
    };

    try {
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error details:', errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Response data:', data);
        
        // Handle error response from server
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Store conversation ID for future messages
        if (data.conversationId) {
            this.conversationId = data.conversationId;
        }
        
        return data.text;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}
  
  addMessage(text, sender) {
    // Remove welcome message if it's the first real message
    if (this.chatLog.querySelector(".welcome-message")) {
      this.chatLog.innerHTML = "";
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    const messageText = document.createElement("div");
    messageText.className = "message-text";
    messageText.textContent = text;

    const time = document.createElement("div");
    time.className = "message-time";
    time.textContent = this.getCurrentTime();

    bubble.appendChild(messageText);
    bubble.appendChild(time);
    messageDiv.appendChild(bubble);

    this.chatLog.appendChild(messageDiv);
    this.scrollToBottom();
  }

  showTypingIndicator() {
    this.isTyping = true;
    this.sendBtn.disabled = true;
    this.sendBtn.textContent = "Typing...";

    const typingDiv = document.createElement("div");
    typingDiv.className = "message bot-message";
    typingDiv.id = "typing-indicator";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble typing-bubble";
    bubble.innerHTML =
      '<div class="typing-dots"><span></span><span></span><span></span></div>';

    typingDiv.appendChild(bubble);
    this.chatLog.appendChild(typingDiv);
    this.scrollToBottom();
  }

  removeTypingIndicator() {
    this.isTyping = false;
    this.sendBtn.disabled = false;
    this.sendBtn.textContent = "Send 💌";

    const typingIndicator = document.getElementById("typing-indicator");
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  showWelcomeMessage() {
    const greetings = [
      `Hey ${userPreferences.name}! 💖 I've been waiting for you! How's your day going?`,
      `Hello beautiful ${userPreferences.name}! 😘 Ready for our chat?`,
      `Hi ${userPreferences.name}! 💕 I'm so excited to talk with you!`,
      `Hey there ${userPreferences.name}! 🌸 I've been thinking about you!`,
    ];

    const randomGreeting =
      greetings[Math.floor(Math.random() * greetings.length)];
    this.addMessage(randomGreeting, "bot");
  }

  getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  scrollToBottom() {
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  createHearts();
  new PersonalizationModal();
});

// Add more hearts periodically
setInterval(() => {
  const heartsContainer = document.querySelector(".hearts-container");
  if (heartsContainer && Math.random() > 0.7) {
    createHeart(heartsContainer);
  }
}, 3000);
