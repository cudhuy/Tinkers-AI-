import asyncio
import websockets
import json

# Set to keep track of all connected clients
connected_clients = set()

async def echo(websocket):
    try:
        # Add the client to our set of connected clients
        connected_clients.add(websocket)
        print(f"Client connected. Total clients: {len(connected_clients)}")
        
        async for message in websocket:
            try:
                # Parse the incoming message as JSON
                data = json.loads(message)
                print(f"Received message: {data}")
                
                # Handle different message types
                if data.get('type') == 'query':
                    response = {
                        'type': 'response',
                        'content': f"Received your question: {data.get('content')}"
                    }
                    # Send response only to the client that sent the query
                    await websocket.send(json.dumps(response))
                    
                elif data.get('type') == 'ping':
                    # Respond to ping with a pong to keep the connection alive
                    response = {
                        'type': 'pong',
                        'content': 'keepalive'
                    }
                    print("Received ping, sending pong")
                    await websocket.send(json.dumps(response))
                    
                # If it's a message from the agent system, broadcast to all clients
                elif 'content' in data and not data.get('type') == 'ping':
                    # Format for broadcasting to web clients
                    broadcast_message = {
                        'type': 'update',
                        'content': data.get('content')
                    }
                    # Broadcast to all connected clients
                    await broadcast(json.dumps(broadcast_message))
                    
                    # Also send acknowledgment to the sender
                    response = {
                        'type': 'update',
                        'content': f"Broadcast: {data.get('content')}"
                    }
                    await websocket.send(json.dumps(response))
                else:
                    response = {
                        'type': 'update',
                        'content': f"Received unknown message type: {data.get('type')}"
                    }
                    await websocket.send(json.dumps(response))
                
            except json.JSONDecodeError:
                # If not valid JSON, echo back as plain text
                print(f"Received non-JSON message: {message}")
                # Try to broadcast the raw message
                try:
                    broadcast_message = {
                        'type': 'update',
                        'content': message
                    }
                    await broadcast(json.dumps(broadcast_message))
                except:
                    # If broadcasting fails, just send error to the sender
                    await websocket.send(json.dumps({
                        'type': 'error',
                        'content': 'Invalid message format. Please send JSON.'
                    }))
    except websockets.exceptions.ConnectionClosed:
        print("Connection closed")
    except Exception as e:
        print(f"Error in echo handler: {e}")
    finally:
        # Remove the client from our set when they disconnect
        connected_clients.remove(websocket)
        print(f"Client disconnected. Total clients: {len(connected_clients)}")


async def broadcast(message):
    """Broadcast a message to all connected clients"""
    if connected_clients:
        # Create a list of coroutines to send the message to each client
        coroutines = [client.send(message) for client in connected_clients]
        # Execute all coroutines concurrently
        await asyncio.gather(*coroutines, return_exceptions=True)
        print(f"Broadcast message to {len(connected_clients)} clients")


async def start_websocket_server():
    # Set a longer ping timeout and interval to prevent quick disconnections
    server = await websockets.serve(
        echo, 
        "localhost", 
        8765, 
        ping_interval=50,  # Send ping every 50 seconds
        ping_timeout=30    # Wait 30 seconds for pong response
    )
    print("WebSocket server started on ws://localhost:8765")
    await server.wait_closed()


async def main():
    await start_websocket_server()


if __name__ == "__main__":
    asyncio.run(main())
