#!/usr/bin/env python3
"""
Server lifecycle manager for Playwright testing.
Starts a dev server, waits for it to be ready, runs tests, then cleans up.

Usage:
    python scripts/with_server.py --server "bun run dev" --port 3000 -- python your_test.py

    # Multiple servers:
    python scripts/with_server.py \\
      --server "cd backend && python server.py" --port 3000 \\
      --server "cd frontend && npm run dev" --port 5173 \\
      -- python your_automation.py
"""

import subprocess
import socket
import time
import signal
import sys
import argparse
import os


def wait_for_port(port, timeout=30):
    """Wait until a port is accepting connections."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(('localhost', port), timeout=1):
                return True
        except (socket.error, ConnectionRefusedError, OSError):
            time.sleep(0.5)
    return False


def main():
    parser = argparse.ArgumentParser(description='Manage server lifecycle for testing')
    parser.add_argument('--server', action='append', dest='servers', default=[],
                        help='Server command to run (can be specified multiple times)')
    parser.add_argument('--port', action='append', dest='ports', type=int, default=[],
                        help='Port the server listens on (one per --server)')
    parser.add_argument('command', nargs=argparse.REMAINDER,
                        help='Test command to run after servers are ready')

    args = parser.parse_args()

    if not args.servers:
        print("Error: at least one --server is required")
        sys.exit(1)

    if len(args.servers) != len(args.ports):
        print("Error: number of --server and --port must match")
        sys.exit(1)

    # Start all servers
    processes = []
    try:
        for i, server_cmd in enumerate(args.servers):
            port = args.ports[i]
            print(f"Starting server: {server_cmd} (port {port})")
            proc = subprocess.Popen(
                server_cmd,
                shell=True,
                preexec_fn=os.setsid,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            processes.append(proc)

        # Wait for all ports to be ready
        for i, port in enumerate(args.ports):
            print(f"Waiting for port {port}...")
            if not wait_for_port(port):
                print(f"Timeout waiting for port {port}")
                sys.exit(1)
            print(f"Port {port} is ready")

        # Run the test command
        if args.command:
            test_cmd = args.command
            if test_cmd[0] == '--':
                test_cmd = test_cmd[1:]
            print(f"Running: {' '.join(test_cmd)}")
            result = subprocess.run(test_cmd)
            sys.exit(result.returncode)
        else:
            print("No test command provided, servers running. Press Ctrl+C to stop.")
            while True:
                time.sleep(1)

    finally:
        # Cleanup: kill all server processes
        print("\nShutting down servers...")
        for proc in processes:
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            except (ProcessLookupError, OSError):
                pass
        for proc in processes:
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
                except (ProcessLookupError, OSError):
                    pass
        print("Servers stopped.")


if __name__ == '__main__':
    main()
