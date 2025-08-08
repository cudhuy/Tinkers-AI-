// web.js - Establishes WebSocket connection to manage_agents.py

document.addEventListener('DOMContentLoaded', () => {
	const messageContainer = document.getElementById('message-container');
	const queryInput = document.getElementById('query-input');
	const sendButton = document.getElementById('send-btn');

	let socket;
	let reconnectAttempts = 0;
	let reconnectInterval = 1000; // Start with 1 second
	let maxReconnectInterval = 30000; // Max 30 seconds
	let pingInterval;

	// Initialize WebSocket connection
	function connectWebSocket() {
		// Clear any existing messages when reconnecting
		if (reconnectAttempts > 0) {
			messageContainer.innerHTML = '';
			addMessage('Reconnecting to server...', 'system');
		}

		// Create WebSocket connection
		socket = new WebSocket('ws://localhost:8765');

		// Connection opened
		socket.addEventListener('open', (event) => {
			console.log('Connected to WebSocket server');
			addMessage('Connected to agent server!', 'system');

			// Reset reconnection parameters on successful connection
			reconnectAttempts = 0;
			reconnectInterval = 1000;

			// Set up ping to keep connection alive
			clearInterval(pingInterval);
			pingInterval = setInterval(() => {
				if (socket.readyState === WebSocket.OPEN) {
					// Send a ping message every 30 seconds to keep the connection alive
					socket.send(
						JSON.stringify({
							type: 'ping',
							content: 'keepalive',
						}),
					);
					console.log('Ping sent to keep connection alive');
				}
			}, 30000);
		});

		// Listen for messages from the server
		socket.addEventListener('message', (event) => {
			try {
				const message = JSON.parse(event.data);
				console.log('Message from server:', message);

				switch (message.type) {
					case 'update':
						// Updates from the server
						addMessage(message.content, 'update');
						break;
					case 'response':
						// Response to a specific query
						addMessage(`Response: ${message.content}`, 'response');
						break;
					case 'error':
						// Error messages
						addMessage(`Error: ${message.content}`, 'error');
						break;
					case 'pong':
						// Server response to ping (optional)
						console.log('Received pong from server');
						break;
					default:
						addMessage(`Received: ${message.content}`, 'unknown');
				}
			} catch (e) {
				console.error('Error parsing message:', e);
				addMessage(`Received invalid message format: ${event.data}`, 'error');
			}
		});

		// Connection closed
		socket.addEventListener('close', (event) => {
			console.log('Disconnected from WebSocket server', event);
			clearInterval(pingInterval);

			// Only show disconnection message if we're not immediately reconnecting
			if (reconnectAttempts === 0) {
				addMessage(
					'Disconnected from agent server. Attempting to reconnect...',
					'error',
				);
			}

			// Implement exponential backoff for reconnection
			reconnectAttempts++;
			const timeout = Math.min(
				reconnectInterval * Math.pow(1.5, reconnectAttempts - 1),
				maxReconnectInterval,
			);

			console.log(`Attempting to reconnect in ${timeout / 1000} seconds...`);
			setTimeout(connectWebSocket, timeout);
		});

		// Connection error
		socket.addEventListener('error', (event) => {
			console.error('WebSocket error:', event);
			addMessage(
				'Error connecting to agent server. Attempting to reconnect...',
				'error',
			);
			// The close event will be triggered after an error, so reconnection is handled there
		});
	}

	// Send message to WebSocket server
	function sendMessage() {
		const query = queryInput.value.trim();
		if (query && socket && socket.readyState === WebSocket.OPEN) {
			const message = {
				type: 'query',
				content: query,
			};
			socket.send(JSON.stringify(message));
			addMessage(`Question: ${query}`, 'sent');
			queryInput.value = '';
		} else if (!socket || socket.readyState !== WebSocket.OPEN) {
			addMessage('Cannot send message: Not connected to server', 'error');
		}
	}

	// Add a message to the UI
	function addMessage(text, type = 'default') {
		const messageElement = document.createElement('div');
		messageElement.classList.add('message');

		// Add specific class based on message type
		if (type) {
			messageElement.classList.add(type);
		}

		const timestamp = new Date().toLocaleTimeString();

		messageElement.innerHTML = `
            ${text}
            <div class="timestamp">${timestamp}</div>
        `;

		messageContainer.appendChild(messageElement);
		messageContainer.scrollTop = messageContainer.scrollHeight;
	}

	// Set up event listeners
	sendButton.addEventListener('click', sendMessage);
	queryInput.addEventListener('keypress', (event) => {
		if (event.key === 'Enter') {
			sendMessage();
		}
	});

	// Initial connection
	connectWebSocket();

	// Add reconnect button functionality
	window.reconnectWebSocket = function () {
		if (socket) {
			socket.close();
		}
		connectWebSocket();
	};
});
