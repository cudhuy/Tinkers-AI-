// web.js - Establishes WebSocket connection to manage_agents.py

document.addEventListener('DOMContentLoaded', () => {
	const messageContainer = document.getElementById('message-container');
	const queryInput = document.getElementById('query-input');
	const sendButton = document.getElementById('send-btn');

	// Create WebSocket connection
	const socket = new WebSocket('ws://localhost:8765');

	// Connection opened
	socket.addEventListener('open', (event) => {
		console.log('Connected to WebSocket server');
		addMessage('Connected to agent server!', 'system');
	});

	// Listen for messages from the server
	socket.addEventListener('message', (event) => {
		const message = JSON.parse(event.data);
		console.log('Message from server:', message);

		switch (message.type) {
			case 'update':
				// Random messages sent every 3 seconds
				addMessage(message.content, 'update');
				break;
			case 'response':
				// Response to a specific query
				addMessage(`Response: ${message.content}`, 'response');
				break;
			default:
				addMessage(`Received: ${message.content}`, 'unknown');
		}
	});

	// Connection closed
	socket.addEventListener('close', (event) => {
		console.log('Disconnected from WebSocket server');
		addMessage(
			'Disconnected from agent server. Please refresh to reconnect.',
			'error',
		);
	});

	// Connection error
	socket.addEventListener('error', (event) => {
		console.error('WebSocket error:', event);
		addMessage(
			'Error connecting to agent server. Make sure the server is running.',
			'error',
		);
	});

	// Send message to WebSocket server
	sendButton.addEventListener('click', sendMessage);
	queryInput.addEventListener('keypress', (event) => {
		if (event.key === 'Enter') {
			sendMessage();
		}
	});

	function sendMessage() {
		const query = queryInput.value.trim();
		if (query && socket.readyState === WebSocket.OPEN) {
			const message = {
				type: 'query',
				content: query,
			};
			socket.send(JSON.stringify(message));
			addMessage(`Question: ${query}`, 'sent');
			queryInput.value = '';
		}
	}

	// Add a message to the UI
	function addMessage(text, type = 'default') {
		const messageElement = document.createElement('div');
		messageElement.classList.add('message', type);

		const timestamp = new Date().toLocaleTimeString();

		messageElement.innerHTML = `
            ${text}
            <div class="timestamp">${timestamp}</div>
        `;

		messageContainer.appendChild(messageElement);
		messageContainer.scrollTop = messageContainer.scrollHeight;
	}
});
