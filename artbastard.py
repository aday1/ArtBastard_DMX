#!/usr/bin/env python3
"""
ArtBastard - DMX512FTW
A Python script to manage the ArtBastard DMX512 application.
"""

import os
import sys
import time
import json
import signal
import socket
import subprocess
import webbrowser
from datetime import datetime
from pathlib import Path
import venv
import site

# Configuration
VENV_DIR = ".venv"  # Directory for virtual environment

# Function to ensure we're running in a virtual environment with all dependencies
def ensure_venv_with_deps():
    """Create virtual environment if needed and install required dependencies"""
    venv_dir = Path(VENV_DIR).absolute()
    venv_python = venv_dir / ("Scripts" if sys.platform == "win32" else "bin") / "python"
    
    # Check if we're already in the venv
    in_venv = sys.prefix != sys.base_prefix
    
    if in_venv:
        # We're in a venv, just make sure dependencies are installed
        try:
            import psutil
            import rich
            import pythonosc
            return  # All dependencies already available
        except ImportError:
            pass  # Will install missing dependencies
    else:
        # Not in venv, check if it exists
        if not venv_python.exists():
            print(f"Creating virtual environment in {venv_dir}...")
            venv.create(venv_dir, with_pip=True)
            
        # Install dependencies in the venv
        print("Installing required dependencies in virtual environment...")
        required_packages = ["rich", "psutil", "python-osc"]
        subprocess.check_call([str(venv_python), "-m", "pip", "install"] + required_packages)
        
        # Re-execute script with the venv python
        print(f"Restarting script with virtual environment...")
        os.execv(str(venv_python), [str(venv_python), __file__])

# Ensure virtual environment with dependencies
if __name__ == "__main__":
    # Only run this if we're not in a venv yet or if dependencies aren't installed
    try:
        import psutil
        import rich
        import pythonosc
    except ImportError:
        ensure_venv_with_deps()

# Now import all required packages which should be available
import psutil
import threading
from rich.console import Console
from rich.panel import Panel
from rich.layout import Layout
from rich.live import Live
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.text import Text
from rich.prompt import Prompt, Confirm
from rich.syntax import Syntax
import pythonosc
from pythonosc import dispatcher
from pythonosc import osc_server

# Configuration
BACKEND_PORT = 3000
FRONTEND_PORT = 3001
FRONTEND_DIR = "react-app"
LOG_DIR = "logs"
ERROR_LOG = "errors.log"
OSC_PORT = 8000  # Port for monitoring OSC messages
CONFIG_DIR = "data"
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")

# Initialize console
console = Console()

# State tracking
running_processes = {}
osc_monitor = None
osc_messages = []
last_logs = []

class ArtBastard:
    """Main application class for ArtBastard."""

    def __init__(self):
        self.console = Console()
        self._ensure_directories()
        self.backend_pid = None
        self.frontend_pid = None
        self.monitor_thread = None
        self.monitor_running = False
        self.osc_server = None

    def _ensure_directories(self):
        """Ensure all necessary directories exist."""
        os.makedirs(LOG_DIR, exist_ok=True)
        os.makedirs(os.path.join("dist", "data"), exist_ok=True)
        os.makedirs(os.path.join("dist", "logs"), exist_ok=True)

    def _create_default_config(self):
        """Create a default config file if it doesn't exist."""
        if not os.path.exists(CONFIG_FILE):
            os.makedirs(CONFIG_DIR, exist_ok=True)
            default_config = {
                "artNetConfig": {
                    "ip": "192.168.1.199",
                    "subnet": 0,
                    "universe": 0,
                    "net": 0,
                    "port": 6454,
                    "base_refresh_interval": 1000
                },
                "midiMappings": {}
            }
            with open(CONFIG_FILE, 'w') as f:
                json.dump(default_config, f, indent=2)
            self.console.print("✨ Created default config.json file", style="green")

    def _is_port_available(self, port: int) -> bool:
        """Check if a port is available."""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = False
        try:
            sock.bind(("127.0.0.1", port))
            result = True
        except:
            pass
        finally:
            sock.close()
        return result

    def _kill_process_on_port(self, port: int) -> bool:
        """Kill any process running on the specified port."""
        try:
            if sys.platform == 'win32':
                self.console.print(f"Looking for processes using port {port}...", style="yellow")
                result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
                if result.returncode == 0:
                    for line in result.stdout.splitlines():
                        if f":{port}" in line and ('LISTENING' in line or 'ESTABLISHED' in line):
                            parts = line.strip().split()
                            if len(parts) >= 5:
                                try:
                                    pid = int(parts[-1])
                                    self.console.print(f"Found process with PID {pid} using port {port} - terminating...", style="red")
                                    try:
                                        subprocess.run(['taskkill', '/PID', str(pid)], capture_output=True)
                                        time.sleep(1)
                                        subprocess.run(['taskkill', '/F', '/PID', str(pid)], capture_output=True)
                                        return True
                                    except:
                                        self.console.print(f"Failed to kill process with PID {pid}", style="red")
                                except:
                                    pass
            else:
                self.console.print(f"Looking for processes using port {port}...", style="yellow")
                result = subprocess.run(['lsof', '-i', f':{port}'], capture_output=True, text=True)
                if result.returncode == 0 and result.stdout.strip():
                    for line in result.stdout.splitlines()[1:]:
                        parts = line.strip().split()
                        if len(parts) >= 2:
                            try:
                                pid = int(parts[1])
                                self.console.print(f"Found process with PID {pid} using port {port} - terminating...", style="red")
                                try:
                                    os.kill(pid, signal.SIGTERM)
                                    time.sleep(1)
                                    if psutil.pid_exists(pid):
                                        os.kill(pid, signal.SIGKILL)
                                    return True
                                except:
                                    self.console.print(f"Failed to kill process with PID {pid}", style="red")
                            except:
                                pass
            self.console.print("Using fallback method to check for processes on port...", style="yellow")
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    proc_info = proc.as_dict(attrs=['pid', 'name'])
                    pid = proc_info['pid']
                    try:
                        connections = proc.net_connections() if hasattr(proc, 'net_connections') else []
                        for conn in connections:
                            if hasattr(conn, 'laddr') and hasattr(conn.laddr, 'port') and conn.laddr.port == port:
                                self.console.print(f"Process {pid} ({proc_info['name']}) is using port {port} - terminating...", 
                                                style="red")
                                psutil.Process(pid).terminate()
                                time.sleep(1)
                                if psutil.pid_exists(pid):
                                    psutil.Process(pid).kill()
                                return True
                    except (psutil.AccessDenied, psutil.NoSuchProcess, AttributeError):
                        continue
                except (psutil.NoSuchProcess, psutil.AccessDenied, KeyError):
                    continue
        except Exception as e:
            self.console.print(f"Error checking processes: {e}", style="red")
        return False

    def _kill_processes_on_ports(self):
        """Kill processes using the backend and frontend ports."""
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]Freeing ports for the performance..."),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=None)
            self._kill_process_on_port(BACKEND_PORT)
            self._kill_process_on_port(FRONTEND_PORT)
            progress.update(task, completed=True)

    def _wait_for_service(self, url: str, max_attempts: int = 30) -> bool:
        """Wait for a service to be available at the specified URL."""
        with Progress(
            SpinnerColumn(),
            TextColumn(f"[bold blue]Waiting for service at {url}..."),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=max_attempts)
            import http.client
            from urllib.parse import urlparse
            parsed_url = urlparse(url)
            host = parsed_url.hostname or 'localhost'
            port = parsed_url.port or 80
            path = parsed_url.path or '/'
            self.console.print(f"DEBUG: Checking connection to {host}:{port}{path}", style="yellow")
            for i in range(max_attempts):
                import socket
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(1)
                socket_result = False
                try:
                    s.connect((host, port))
                    socket_result = True
                    self.console.print(f"DEBUG: Socket connection to {host}:{port} successful", style="green")
                except (socket.timeout, ConnectionRefusedError) as e:
                    self.console.print(f"DEBUG: Socket connection failed: {e}", style="yellow")
                finally:
                    s.close()
                if socket_result:
                    try:
                        conn = http.client.HTTPConnection(host, port, timeout=1)
                        conn.request("HEAD", path)
                        response = conn.getresponse()
                        conn.close()
                        self.console.print(f"DEBUG: HTTP connection successful with status code {response.status}", style="green")
                        return True
                    except Exception as e:
                        self.console.print(f"DEBUG: HTTP request failed: {str(e)}", style="yellow")
                        if socket_result:
                            self.console.print(f"DEBUG: Considering service running based on open socket", style="green")
                            return True
                progress.update(task, advance=1)
                time.sleep(1)
            return False

    def _launch_browser(self, url):
        """Launch a browser with the given URL."""
        self.console.print(f"『 Opening the frontend in your browser... 』", style="cyan")
        try:
            webbrowser.open(url)
        except Exception as e:
            self.console.print(f"Error opening browser: {e}", style="red")

    def _monitor_thread_func(self):
        """Background thread function for system monitoring."""
        global last_logs
        while self.monitor_running:
            time.sleep(1)
            if self.backend_pid and os.path.exists(f"{LOG_DIR}/backend.pid"):
                log_files = sorted([f for f in os.listdir(LOG_DIR) if f.startswith("backend-")])
                if log_files:
                    latest_log = os.path.join(LOG_DIR, log_files[-1])
                    try:
                        with open(latest_log, 'r', errors='replace') as f:
                            content = f.readlines()
                            if content:
                                last_n = min(5, len(content))
                                last_logs = content[-last_n:]
                    except Exception:
                        pass

    def _display_dashboard(self):
        """Display a monitoring dashboard."""
        layout = Layout()
        layout.split(
            Layout(name="header", size=3),
            Layout(name="main"),
            Layout(name="footer", size=3)
        )
        layout["main"].split_row(
            Layout(name="left", ratio=2),
            Layout(name="right", ratio=1),
        )
        layout["left"].split(
            Layout(name="status", size=8),
            Layout(name="logs"),
            Layout(name="osc", size=10),
        )
        def update_dashboard():
            header = Panel(
                Text("⚡ ArtBastard DMX512FTW ⚡", justify="center"),
                style="cyan",
                border_style="cyan"
            )
            status_table = Table(show_header=True, header_style="bold magenta", expand=True)
            status_table.add_column("Service")
            status_table.add_column("Status")
            status_table.add_column("PID")
            status_table.add_column("Port")
            status_table.add_column("URL")
            backend_status = "✅ Running" if self.backend_pid else "❌ Stopped"
            backend_pid = str(self.backend_pid) if self.backend_pid else "-"
            backend_url = f"http://localhost:{BACKEND_PORT}"
            status_table.add_row("Backend", backend_status, backend_pid, str(BACKEND_PORT), backend_url)
            system_table = Table(show_header=True, header_style="bold blue", expand=True)
            system_table.add_column("Metric")
            system_table.add_column("Value")
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            mem_percent = memory.percent
            system_table.add_row("CPU Usage", f"{cpu_percent}%")
            system_table.add_row("Memory Usage", f"{mem_percent}%")
            system_table.add_row("Time", datetime.now().strftime("%H:%M:%S"))
            logs_content = "\n".join(last_logs) if last_logs else "No recent logs"
            logs_panel = Panel(logs_content, title="Recent Logs", border_style="green")
            osc_content = "\n".join(osc_messages[-5:]) if osc_messages else "No OSC messages received"
            osc_panel = Panel(osc_content, title="OSC Messages", border_style="yellow")
            footer = Panel(
                Text("Press Ctrl+C to return to menu", justify="center"),
                style="dim",
                border_style="dim"
            )
            layout["header"].update(header)
            layout["status"].update(Panel(status_table, title="Services", border_style="blue"))
            layout["logs"].update(logs_panel)
            layout["osc"].update(osc_panel)
            layout["right"].update(Panel(system_table, title="System Metrics", border_style="magenta"))
            layout["footer"].update(footer)
            return layout
        try:
            with Live(update_dashboard(), refresh_per_second=2, screen=True) as live:
                while True:
                    time.sleep(0.5)
                    live.update(update_dashboard())
        except KeyboardInterrupt:
            return

    def _stop_services(self):
        """Stop backend and frontend services if they're running."""
        if self.backend_pid:
            try:
                if psutil.pid_exists(self.backend_pid):
                    p = psutil.Process(self.backend_pid)
                    p.terminate()
                    p.wait(timeout=3)
                self.backend_pid = None
            except (psutil.NoSuchProcess, psutil.TimeoutExpired):
                pass
        self.console.print("『 Services have been stopped 』", style="yellow")

    def start_osc_monitor(self, port=OSC_PORT):
        """Start monitoring OSC messages."""
        global osc_messages
        if self.osc_server:
            self.console.print("OSC monitor is already running", style="yellow")
            return
        def osc_handler(address, *args):
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            message = f"{timestamp} {address}: {args}"
            osc_messages.append(message)
            if len(osc_messages) > 100:
                osc_messages.pop(0)
        try:
            from pythonosc import dispatcher
            from pythonosc import osc_server
            disp = dispatcher.Dispatcher()
            disp.set_default_handler(osc_handler)
            server = osc_server.ThreadingOSCUDPServer(("127.0.0.1", port), disp)
            self.console.print(f"👂 Listening for OSC messages on port {port}...", style="green")
            self.osc_thread = threading.Thread(target=server.serve_forever)
            self.osc_thread.daemon = True
            self.osc_thread.start()
            self.osc_server = server
        except Exception as e:
            self.console.print(f"Error starting OSC monitor: {e}", style="red")

    def stop_osc_monitor(self):
        """Stop monitoring OSC messages."""
        if self.osc_server:
            self.osc_server.shutdown()
            self.osc_server = None
            self.console.print("OSC monitor stopped", style="yellow")
        else:
            self.console.print("OSC monitor is not running", style="yellow")

    def start_system_monitor(self):
        """Start monitoring system metrics."""
        if self.monitor_thread and self.monitor_running:
            self.console.print("System monitor is already running", style="yellow")
            return
        self.monitor_running = True
        self.monitor_thread = threading.Thread(target=self._monitor_thread_func)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        self.console.print("🔍 System monitoring started", style="green")

    def stop_system_monitor(self):
        """Stop the system monitor."""
        self.monitor_running = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=1)
            self.monitor_thread = None
        self.console.print("🛑 System monitoring stopped", style="yellow")

    def system_setup(self):
        """Install system dependencies."""
        self.console.print("🎪 Preparing the Stage (System Setup)", style="bold cyan")
        
        # Check if npm is in PATH
        npm_cmd = "npm"
        try:
            # Try to run npm --version to check if npm is available
            subprocess.run([npm_cmd, "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        except (subprocess.SubprocessError, FileNotFoundError):
            # If not found, try common npm locations
            common_npm_paths = [
                os.path.join(os.environ.get("APPDATA", ""), "npm", "npm.cmd"),
                os.path.join(os.environ.get("ProgramFiles", ""), "nodejs", "npm.cmd"),
                os.path.join(os.environ.get("ProgramFiles(x86)", ""), "nodejs", "npm.cmd"),
                # Add any other common npm locations
            ]
            
            for path in common_npm_paths:
                if os.path.exists(path):
                    npm_cmd = path
                    self.console.print(f"Found npm at: {npm_cmd}", style="green")
                    break
            else:
                self.console.print("❌ npm not found in PATH. Please install Node.js and npm.", style="red")
                self.console.print("Download Node.js from: https://nodejs.org/", style="yellow")
                Prompt.ask("Press Enter to continue...", default="")
                return False
        
        if not Confirm.ask("Do you want to install system dependencies?"):
            return
        
        # Create logs directory if it doesn't exist
        os.makedirs(LOG_DIR, exist_ok=True)
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]Installing backend dependencies..."),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=None)
            try:
                # Use the detected npm command
                subprocess.run([npm_cmd, "install"], check=False)
                progress.update(task, completed=True)
            except Exception as e:
                self.console.print(f"Error installing backend dependencies: {e}", style="red")
                return False
        
        os.chdir(FRONTEND_DIR)
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]Installing frontend dependencies..."),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=None)
            try:
                # Use the detected npm command
                subprocess.run([npm_cmd, "install"], check=False)
                progress.update(task, completed=True)
            except Exception as e:
                self.console.print(f"Error installing frontend dependencies: {e}", style="red")
                os.chdir("..")
                return False
        
        os.chdir("..")
        
        self.console.print("✨ System setup complete!", style="green")
        return True

    def clear_cache(self):
        """Clear node_modules and dist directories."""
        self.console.print("🧹 Clearing the Canvas (Cache Cleaning)", style="bold cyan")
        if not Confirm.ask("『 Shall we purify the artistic workspace? 』"):
            return
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]『 Clearing the canvas... 』"),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=None)
            if os.path.exists("node_modules"):
                import shutil
                shutil.rmtree("node_modules", ignore_errors=True)
            if os.path.exists(os.path.join(FRONTEND_DIR, "node_modules")):
                import shutil
                shutil.rmtree(os.path.join(FRONTEND_DIR, "node_modules"), ignore_errors=True)
            if os.path.exists("dist"):
                import shutil
                shutil.rmtree("dist", ignore_errors=True)
            if os.path.exists(os.path.join(FRONTEND_DIR, "dist")):
                import shutil
                shutil.rmtree(os.path.join(FRONTEND_DIR, "dist"), ignore_errors=True)
            subprocess.run(["npm", "cache", "clean", "--force"], 
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
            progress.update(task, completed=True)
        self.console.print("✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧", style="green")

    def rebuild_system(self):
        """Rebuild the entire system."""
        self.console.print("🎨 Reinventing the Canvas (Rebuild)", style="bold cyan")
        if not Confirm.ask("This will rebuild the entire system. Continue?"):
            return
        self.clear_cache()
        self.system_setup()
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]Building backend..."),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=None)
            subprocess.run(["npm", "run", "build-backend"], 
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
            progress.update(task, completed=True)
        os.chdir(FRONTEND_DIR)
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]Building frontend..."),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=None)
            subprocess.run(["npm", "run", "build"], 
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
            progress.update(task, completed=True)
        os.chdir("..")
        self.console.print("✨ System rebuild complete!", style="green")

    def show_midi_info(self):
        """Display information about MIDI interfaces."""
        self.console.print("🎹 Surveying the Musical Landscape (MIDI Info)", style="bold cyan")
        if not os.path.exists("dist/index.js"):
            self.console.print("Backend not built yet. Please build the backend first.", style="red")
            return
        self.console.print("『 Discovering the Musical Constellations... 』", style="cyan")
        result = subprocess.run(
            ["node", "-e", "require('./dist/index.js').listMidiInterfaces()"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False
        )
        if result.returncode == 0:
            midi_info = result.stdout
            syntax = Syntax(midi_info, "javascript", theme="monokai", line_numbers=True)
            self.console.print(Panel(syntax, title="MIDI Interfaces", border_style="green"))
        else:
            self.console.print("❌ Error getting MIDI information:", style="red")
            self.console.print(result.stderr, style="red")

    def view_logs(self):
        """View application logs."""
        self.console.print("📜 Consulting the Ancient Scrolls (View Logs)", style="bold cyan")
        if not os.path.exists(LOG_DIR):
            self.console.print("No logs found!", style="red")
            return
        log_files = ["errors.log"] + [f for f in os.listdir(LOG_DIR) if os.path.isfile(os.path.join(LOG_DIR, f))]
        self.console.print("Select a log file to view:", style="cyan")
        for i, log_file in enumerate(log_files):
            self.console.print(f"[{i}] {log_file}")
        choice = Prompt.ask("Enter number", default="0")
        try:
            choice = int(choice)
            if 0 <= choice < len(log_files):
                selected_log = log_files[choice]
                if selected_log == "errors.log":
                    log_path = ERROR_LOG
                else:
                    log_path = os.path.join(LOG_DIR, selected_log)
                if os.path.exists(log_path):
                    with open(log_path, 'r', errors='replace') as f:
                        log_content = f.read()
                    pager = subprocess.Popen(['less'], stdin=subprocess.PIPE)
                    pager.communicate(input=log_content.encode())
                else:
                    self.console.print(f"Log file {log_path} not found!", style="red")
            else:
                self.console.print("Invalid choice!", style="red")
        except ValueError:
            self.console.print("Invalid input!", style="red")

    def update_from_github(self):
        """Update from GitHub repository."""
        self.console.print("⬆️ Channeling the Latest Inspiration (Update)", style="bold cyan")
        if not Confirm.ask("『 Shall we fetch the latest artistic inspiration? 』"):
            return
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]『 Syncing with the celestial repository... 』"),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=None)
            result = subprocess.run(["git", "pull"], 
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE, 
                                  text=True, check=False)
            progress.update(task, completed=True)
        if result.returncode == 0:
            self.console.print("✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧", style="green")
            self.console.print(result.stdout)
        else:
            self.console.print("❌ Error updating from GitHub:", style="red")
            self.console.print(result.stderr, style="red")

    def launch_all(self, bypass_typescript=False):
        """Launch the application."""
        title = "🎭 Commencing the Grand Performance (Launch All)"
        if bypass_typescript:
            title = "🎭✨ Commencing the Performance (Bypass TypeScript)"
        self.console.print(title, style="bold cyan")
        self.console.print("DEBUG: Starting launch process...", style="yellow")
        self._kill_processes_on_ports()
        if not self._is_port_available(BACKEND_PORT):
            self.console.print(f"『 Port {BACKEND_PORT} is still in use even after cleanup. Please investigate further. 』", 
                            style="red")
            Prompt.ask("Press Enter to continue...", default="")
            return False
        if not self._is_port_available(FRONTEND_PORT):
            self.console.print(f"『 Port {FRONTEND_PORT} is still in use even after cleanup. Please investigate further. 』", 
                            style="red")
            Prompt.ask("Press Enter to continue...", default="")
            return False
        if not os.path.exists("node_modules") or not os.path.exists(os.path.join(FRONTEND_DIR, "node_modules")):
            self.console.print("DEBUG: node_modules not found, running system setup", style="yellow")
            self.system_setup()
        self.console.print(f"DEBUG: Checking for dist directory. Exists: {os.path.exists('dist')}", style="yellow")
        if not os.path.exists("dist") or bypass_typescript:
            self.console.print("『 Composing the Backend Movement... 』", style="cyan")
            os.makedirs(os.path.dirname(ERROR_LOG), exist_ok=True)
            self.console.print("DEBUG: Running npm build-backend", style="yellow")
            with open(ERROR_LOG, "a") as error_file:
                try:
                    result = subprocess.run(
                        ["npm", "run", "build-backend"],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        check=False
                    )
                    error_file.write(result.stdout)
                    error_file.write(result.stderr)
                    self.console.print(f"DEBUG: Build process return code: {result.returncode}", style="yellow")
                except Exception as e:
                    self.console.print(f"DEBUG: Error during build: {str(e)}", style="red")
                    error_file.write(f"\nException during build: {str(e)}\n")
            if not os.path.exists("dist"):
                self.console.print("『 Backend build failed! Check errors.log for details. 』", style="red")
                Prompt.ask("Press Enter to continue...", default="")
                return False
        self.console.print("『 Creating the Visual Canvas (Building React Frontend)... 』", style="cyan")
        react_dist_exists = os.path.exists(os.path.join(FRONTEND_DIR, "dist"))
        self.console.print(f"DEBUG: React dist directory exists: {react_dist_exists}", style="yellow")
        if not react_dist_exists or bypass_typescript:
            current_dir = os.getcwd()
            os.chdir(FRONTEND_DIR)
            build_command = "npm run build"
            if bypass_typescript:
                self.console.print("『 Bypassing TypeScript for React Build... 』", style="cyan")
                build_command = "node ../build-without-typechecking.js"
            self.console.print(f"DEBUG: Running React build command: {build_command}", style="yellow")
            with open(os.path.join("..", ERROR_LOG), "a") as error_file:
                try:
                    build_result = subprocess.run(
                        build_command.split(),
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        check=False
                    )
                    error_file.write("\n=== REACT BUILD OUTPUT ===\n")
                    error_file.write(build_result.stdout)
                    error_file.write(build_result.stderr)
                    self.console.print(f"DEBUG: React build return code: {build_result.returncode}", style="yellow")
                    if build_result.returncode != 0:
                        self.console.print("『 React build had errors but we'll continue anyway. Check errors.log for details. 』", style="yellow")
                except Exception as e:
                    self.console.print(f"DEBUG: Error during React build: {str(e)}", style="red")
                    error_file.write(f"\nException during React build: {str(e)}\n")
            os.chdir(current_dir)
            react_dist_exists = os.path.exists(os.path.join(FRONTEND_DIR, "dist"))
            self.console.print(f"DEBUG: React dist directory exists after build: {react_dist_exists}", style="yellow")
        if not os.path.exists("dist/index.js"):
            self.console.print("DEBUG: dist/index.js does not exist after build!", style="red")
            Prompt.ask("Press Enter to continue...", default="")
            return False
        else:
            self.console.print("DEBUG: dist/index.js exists, continuing", style="green")
        self.console.print("『 The Conductor Takes Position... 』", style="cyan")
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        backend_log = f"{LOG_DIR}/backend-{timestamp}.log"
        os.makedirs(os.path.join("dist", "data"), exist_ok=True)
        os.makedirs(os.path.join("dist", "logs"), exist_ok=True)
        self._create_default_config()
        env = os.environ.copy()
        env["NODE_ENV"] = "production"
        self.console.print("DEBUG: Starting backend process with Node.js", style="yellow")
        try:
            backend_process = subprocess.Popen(
                ["node", "dist/launcher.js"],  # Use our new launcher.js instead of directly calling server.js
                stdout=open(backend_log, 'w'),
                stderr=subprocess.STDOUT,
                env=env
            )
            self.backend_pid = backend_process.pid
            self.console.print(f"DEBUG: Backend process started with PID {self.backend_pid}", style="green")
            with open(os.path.join(LOG_DIR, "backend.pid"), 'w') as f:
                f.write(str(self.backend_pid))
        except Exception as e:
            self.console.print(f"DEBUG: Failed to start backend process: {str(e)}", style="red")
            Prompt.ask("Press Enter to continue...", default="")
            return False
        backend_url = f"http://localhost:{BACKEND_PORT}"
        self.console.print(f"DEBUG: Waiting for backend at {backend_url}", style="yellow")
        if not self._wait_for_service(backend_url, 30):
            self.console.print("『 Backend server failed to start. Check logs for details. 』", style="red")
            self.console.print("Last lines of backend log:", style="red")
            try:
                with open(backend_log, 'r') as f:
                    last_lines = f.readlines()[-20:]
                    for line in last_lines:
                        self.console.print(line.rstrip(), style="red")
            except:
                self.console.print("Could not read log file", style="red")
            if self.backend_pid:
                try:
                    psutil.Process(self.backend_pid).terminate()
                except:
                    pass
            Prompt.ask("Press Enter to continue...", default="")
            return False
        self.console.print(f"『 Backend server started successfully on port {BACKEND_PORT}! 』", style="green")
        self.console.print("『 React application is being served by the backend 』", style="cyan")
        self.console.print("DEBUG: Launching browser", style="yellow")
        self._launch_browser(backend_url)
        self.console.print(Panel(
            Text(f"""
            ✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧
            
            React Interface: http://localhost:{BACKEND_PORT}
            
            Launching dashboard for monitoring...
            Press Ctrl+C in the dashboard to return to menu
            """, justify="center"),
            style="bold cyan",
            border_style="cyan"
        ))
        self.console.print("DEBUG: Starting OSC monitor", style="yellow")
        self.start_osc_monitor()
        self.console.print("DEBUG: Starting system monitor", style="yellow")
        self.start_system_monitor()
        self.console.print("DEBUG: Launching dashboard", style="yellow")
        try:
            time.sleep(1)
            self._display_dashboard()
        except KeyboardInterrupt:
            self.console.print("DEBUG: Dashboard interrupted", style="yellow")
        finally:
            pass

    def show_menu(self):
        """Display the main menu and handle user selection."""
        while True:
            self.console.clear()
            self.console.print(Panel(
                Text("\n⚡ ArtBastard DMX512FTW ⚡\n『 The Digital Luminescence Orchestra 』\n▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁\n「 Where Code Meets Light in Perfect Harmony 」\n", 
                     justify="center"),
                style="bold cyan",
                border_style="cyan"
            ))
            self.console.print(Panel(
                Text("✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧\n\n• 'Launch All' - Regular launch with full TypeScript checking\n• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)\n\nBoth options start a complete backend and frontend environment."),
                style="blue",
                border_style="blue"
            ))
            status_table = Table(show_header=True, header_style="bold magenta")
            status_table.add_column("Service")
            status_table.add_column("Status")
            backend_status = "✅ Running" if self.backend_pid and psutil.pid_exists(self.backend_pid) else "❌ Stopped"
            status_table.add_row("Backend", backend_status)
            osc_status = "✅ Running" if self.osc_server else "❌ Stopped"
            status_table.add_row("OSC Monitor", osc_status)
            self.console.print(Panel(status_table, title="Service Status", border_style="magenta"))
            menu_options = {
                'L': "🎭 [L]aunch All (Regular TypeScript)",
                'S': "🎪 [S]ystem Setup",
                'U': "⬆️ [U]pdate from GitHub",
                'M': "🎹 [M]IDI Information",
                'V': "📜 [V]iew Logs",
                'R': "🎨 [R]ebuild System",
                'B': "🎭✨ [B]ypass TypeScript Launch",
                'D': "📊 [D]ashboard",
                'O': "🔍 [O]SC Monitoring Toggle",
                'X': "🛑 Stop [X] All Services",
                'Q': "🌙 [Q]uit"
            }
            self.console.print("Choose an option by typing the letter in [brackets]:", style="bold green")
            for key, option in menu_options.items():
                self.console.print(f"  {option}")
            choice = Prompt.ask("\nEnter your choice", default="L").upper()
            if choice in menu_options:
                if choice == 'L':
                    self.console.print("\n=== Starting services ===\n", style="bold green")
                    result = self.launch_all()
                    if result is False:
                        self.console.print("\n⚠️  Services failed to start. See logs for details.", style="bold red")
                        Prompt.ask("Press Enter to continue...", default="")
                elif choice == 'S':
                    self.system_setup()
                elif choice == 'U':
                    self.update_from_github()
                elif choice == 'M':
                    self.show_midi_info()
                elif choice == 'V':
                    self.view_logs()
                elif choice == 'R':
                    self.rebuild_system()
                elif choice == 'B':
                    self.console.print("\n=== Starting services with TypeScript bypassed ===\n", style="bold green")
                    result = self.launch_all(bypass_typescript=True)
                    if result is False:
                        self.console.print("\n⚠️  Services failed to start. See logs for details.", style="bold red")
                        Prompt.ask("Press Enter to continue...", default="")
                elif choice == 'D':
                    if not self.backend_pid:
                        self.console.print("No services are running. Start services first.", style="yellow")
                        time.sleep(2)
                    else:
                        if not self.osc_server:
                            self.start_osc_monitor()
                        if not self.monitor_running:
                            self.start_system_monitor()
                        self._display_dashboard()
                elif choice == 'O':
                    if self.osc_server:
                        self.stop_osc_monitor()
                    else:
                        self.start_osc_monitor()
                elif choice == 'X':
                    self._stop_services()
                elif choice == 'Q':
                    self._stop_services()
                    self.stop_osc_monitor()
                    self.stop_system_monitor()
                    self.console.print("『 The stage dims, until we meet again... 』", style="bold magenta")
                    return
            else:
                self.console.print(f"Invalid choice: {choice}", style="red")
            if choice not in ['L', 'B', 'D']:
                Prompt.ask("Press Enter to continue...", default="")

    def cleanup(self):
        """Clean up resources before exiting."""
        if self.osc_server:
            self.stop_osc_monitor()
        self.stop_system_monitor()
        pid_files = {
            "backend": os.path.join(LOG_DIR, "backend.pid"),
        }
        for service, pid_file in pid_files.items():
            if os.path.exists(pid_file):
                try:
                    with open(pid_file, 'r') as f:
                        pid = int(f.read().strip())
                    if psutil.pid_exists(pid):
                        try:
                            p = psutil.Process(pid)
                            p.terminate()
                            p.wait(timeout=3)
                        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.TimeoutExpired):
                            pass
                    os.remove(pid_file)
                except:
                    pass
        self._kill_processes_on_ports()

def main():
    """Main entry point for the application."""
    app = ArtBastard()
    def signal_handler(sig, frame):
        print("\nCleaning up...")
        app.cleanup()
        sys.exit(0)
    signal.signal(signal.SIGINT, signal_handler)
    try:
        app.show_menu()
    finally:
        app.cleanup()

if __name__ == "__main__":
    main()