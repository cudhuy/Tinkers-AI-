import asyncio
import websockets
import json
import time

# Sets to keep track of frontend and agent connections
frontend_clients = set()
agent_clients = set()

PING_INTERVAL = 50  # seconds


async def echo(websocket):
    origin = None
    try:
        # Wait for the first message to identify the client type
        first_message = await websocket.recv()
        try:
            first_data = json.loads(first_message)
            origin = first_data.get("from", "frontend")
        except Exception:
            origin = "frontend"

        if origin == "agent":
            agent_clients.add(websocket)
            print(f"Agent connected. Total agents: {len(agent_clients)}")
        else:
            frontend_clients.add(websocket)
            print(f"Frontend connected. Total frontends: {len(frontend_clients)}")

        # Process the first message
        await process_message(websocket, first_message, origin)

        async for message in websocket:
            await process_message(websocket, message, origin)
    except websockets.exceptions.ConnectionClosed:
        print("Connection closed")
    except Exception as e:
        print(f"Error in echo handler: {e}")
    finally:
        if origin == "agent":
            agent_clients.discard(websocket)
            print(f"Agent disconnected. Total agents: {len(agent_clients)}")
        else:
            frontend_clients.discard(websocket)
            print(f"Frontend disconnected. Total frontends: {len(frontend_clients)}")


async def process_message(websocket, message, origin):
    try:
        data = json.loads(message)
        msg_from = data.get("from", origin)
        msg_type = data.get("type")
        print(f"Received message from {msg_from}: {data}")

        if msg_type == "ping":
            response = {"type": "pong", "content": "keepalive"}
            await websocket.send(json.dumps(response))
            return

        # Route based on origin, but do NOT forward pings/pongs to agent
        if msg_from == "frontend" and msg_type != "ping":
            # Forward only non-ping messages to all agents
            for agent_ws in agent_clients.copy():
                print(f"Forwarding message to agent: {data}")
                try:
                    await agent_ws.send(json.dumps(data))
                except Exception:
                    agent_clients.discard(agent_ws)
        elif msg_from == "agent":
            # Forward to all frontends (UI will filter pings/pongs)
            for frontend_ws in frontend_clients.copy():
                try:
                    await frontend_ws.send(json.dumps(data))
                except Exception:
                    frontend_clients.discard(frontend_ws)
        else:
            # Unknown origin, echo back
            await websocket.send(
                json.dumps({"type": "error", "content": "Unknown message origin."})
            )
    except json.JSONDecodeError:
        print(f"Received non-JSON message: {message}")
        await websocket.send(
            json.dumps(
                {
                    "type": "error",
                    "content": "Invalid message format. Please send JSON.",
                }
            )
        )


async def ping_clients():
    while True:
        await asyncio.sleep(PING_INTERVAL)
        # Ping all frontend clients
        for ws in list(frontend_clients):
            try:
                await ws.send(
                    json.dumps(
                        {"type": "ping", "content": "keepalive", "from": "server"}
                    )
                )
            except Exception:
                frontend_clients.discard(ws)


async def start_websocket_server():
    server = await websockets.serve(echo, "localhost", 8765)
    print("WebSocket server started on ws://localhost:8765")
    # Start the ping task
    asyncio.create_task(ping_clients())
    await server.wait_closed()


def main():
    asyncio.run(start_websocket_server())


def keep_running():
    while True:
        try:
            main()
        except Exception as e:
            print(
                f"WebSocket server crashed with error: {e}. Restarting in 2 seconds..."
            )
            time.sleep(2)


if __name__ == "__main__":
    keep_running()
