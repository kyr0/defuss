import asyncio
import sys
from defuss_apl import start
from lib import load_env
from pathlib import Path
from qdrant_client import QdrantClient

async def main():
    
    # Load environment variables
    load_env()

    # Load from agent.apl
    with open(f"{Path(__file__).parent}/agent.apl", "r") as f:
        agent = f.read()

    # Define custom OpenAI endpoint
    options = {
        "base_url": "https://api.openai.com/v1",  # Default OpenAI endpoint
    }
    
    try:
        print("Executing APL agent...")
        result = await start(agent, options)
        if isinstance(result, dict):
            print(f"\n\n---")
            print(f"Result text: '{result.get('result_text', 'No result_text key')}'")
            
            errors = result.get('errors', [])
            if errors:
                print(f"❌ Errors: {errors}")
            
            print(f"Model: {result.get('model', 'No model key')}")
            print(f"---\n\n")
        else:
            print(f"Full result: {result}")
            
    except Exception as e:
        print(f"Error occurred: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())