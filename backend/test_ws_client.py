import asyncio
import json
import websockets

async def run():
    uri = "ws://127.0.0.1:8000/ws"
    async with websockets.connect(uri) as ws:
        # Enviar heartbeat
        await ws.send(json.dumps({"type":"heartbeat"}))
        print("Sent heartbeat")
        # Esperar respuesta breve
        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=2)
            print('Recv:', msg)
        except Exception as e:
            print('No response to heartbeat:', e)

        # Enviar prompt sencillo
        await ws.send("print('hello from test')")
        print('Sent prompt')

        # Leer stream hasta end_of_stream
        while True:
            msg = await ws.recv()
            print('Msg:', msg)
            try:
                j = json.loads(msg)
                if j.get('end_of_stream'):
                    break
            except Exception:
                pass

asyncio.run(run())
