#!/usr/bin/env python3
"""Run an isolated Qualiopi 19 test command with kernel-level egress denial.

The command is started only after loopback connectivity succeeds and external
HTTPS, SMTP and DNS attempts fail inside the same new network namespace.
No production credentials or inherited database variables are passed through.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
from typing import Any

MARKER = "QUALIOPI19_NETWORK_NAMESPACE_V1"
PARENT_NAMESPACE = "QUALIOPI19_PARENT_NET_NAMESPACE"
ALLOWED_ENV = {
    "HOME",
    "LANG",
    "LC_ALL",
    "NODE_PATH",
    "PATH",
    "PLAYWRIGHT_BROWSERS_PATH",
    "TMPDIR",
    "TZ",
}


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def write_journal(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def negative_tcp(host: str, port: int, label: str) -> dict[str, Any]:
    family = socket.AF_INET6 if ":" in host else socket.AF_INET
    client = socket.socket(family, socket.SOCK_STREAM)
    client.settimeout(2)
    try:
        client.connect((host, port))
        return {"test": label, "verdict": "FAIL", "reason": "connection_opened"}
    except OSError as error:
        return {
            "test": label,
            "verdict": "PASS" if error.errno in {101, 113} else "FAIL",
            "errno": error.errno,
            "reason": str(error),
        }
    finally:
        client.close()


def negative_dns() -> dict[str, Any]:
    try:
        socket.getaddrinfo("example.com", 443)
        return {"test": "DNS_EXTERNE", "verdict": "FAIL", "reason": "resolution_opened"}
    except socket.gaierror as error:
        return {"test": "DNS_EXTERNE", "verdict": "PASS", "reason": str(error)}


def loopback_positive() -> dict[str, Any]:
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client: socket.socket | None = None
    accepted: socket.socket | None = None
    try:
        server.bind(("127.0.0.1", 0))
        server.listen(1)
        port = server.getsockname()[1]
        client = socket.create_connection(("127.0.0.1", port), timeout=2)
        accepted, _ = server.accept()
        client.sendall(b"qualiopi19-loopback")
        received = accepted.recv(64)
        return {
            "test": "LOOPBACK_LOCAL",
            "verdict": "PASS" if received == b"qualiopi19-loopback" else "FAIL",
            "port": port,
        }
    except OSError as error:
        return {"test": "LOOPBACK_LOCAL", "verdict": "FAIL", "reason": str(error)}
    finally:
        for item in (client, accepted, server):
            if item is not None:
                item.close()


def namespace_preflight() -> dict[str, Any]:
    tests = [
        loopback_positive(),
        negative_tcp("192.0.2.1", 443, "HTTPS_EXTERNE_IPV4"),
        negative_tcp("192.0.2.1", 25, "SMTP_EXTERNE_IPV4"),
        negative_tcp("192.0.2.1", 587, "SUBMISSION_EMAIL_EXTERNE_IPV4"),
        negative_tcp("2001:db8::1", 443, "HTTPS_EXTERNE_IPV6"),
        negative_tcp("2001:db8::1", 25, "SMTP_EXTERNE_IPV6"),
        negative_dns(),
    ]
    routes = {
        "ipv4": Path("/proc/net/route").read_text(),
        "ipv6": Path("/proc/net/ipv6_route").read_text(),
    }
    only_loopback_ipv4 = all(
        not line or line.startswith("Iface") or line.split()[0] == "lo"
        for line in routes["ipv4"].splitlines()
    )
    route_test = {
        "test": "AUCUNE_ROUTE_NON_LOOPBACK_IPV4",
        "verdict": "PASS" if only_loopback_ipv4 else "FAIL",
    }
    tests.append(route_test)
    ipv6_default_present = any(
        fields[0] == "0" * 32 and fields[1] == "00"
        for line in routes["ipv6"].splitlines()
        if (fields := line.split())
    )
    tests.append({
        "test": "AUCUNE_ROUTE_PAR_DEFAUT_IPV6",
        "verdict": "FAIL" if ipv6_default_present else "PASS",
    })
    current_namespace = os.readlink("/proc/self/ns/net")
    parent_namespace = os.environ.get(PARENT_NAMESPACE, "absent")
    tests.append({
        "test": "NAMESPACE_RESEAU_DISTINCT_DU_PROJET",
        "verdict": "PASS" if current_namespace != parent_namespace else "FAIL",
        "courant": current_namespace,
        "parent": parent_namespace,
    })
    return {
        "schema": "qualiopi19-network-confinement-v1",
        "checked_at": utc_now(),
        "namespace_marker": os.environ.get(MARKER),
        "interfaces": Path("/proc/net/dev").read_text(),
        "routes": routes,
        "tests": tests,
        "verdict": "PASS" if all(item["verdict"] == "PASS" for item in tests) else "FAIL",
    }


def sanitized_environment(journal: Path) -> dict[str, str]:
    environment = {key: value for key, value in os.environ.items() if key in ALLOWED_ENV}
    environment[MARKER] = "active"
    environment["QUALIOPI19_CONFINEMENT_JOURNAL"] = str(journal)
    environment["NO_PROXY"] = "localhost,127.0.0.1,::1"
    environment["no_proxy"] = "localhost,127.0.0.1,::1"
    return environment


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--journal", type=Path, required=True)
    parser.add_argument("--check-only", action="store_true")
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()

    if os.environ.get(MARKER) != "pending":
        command = args.command
        if command and command[0] == "--":
            command = command[1:]
        if not args.check_only and not command:
            parser.error("une commande est requise après --, sauf avec --check-only")
        inner = [sys.executable, str(Path(__file__).resolve()), "--journal", str(args.journal.resolve())]
        if args.check_only:
            inner.append("--check-only")
        if command:
            inner.extend(["--", *command])
        environment = sanitized_environment(args.journal.resolve())
        environment[MARKER] = "pending"
        environment[PARENT_NAMESPACE] = os.readlink("/proc/self/ns/net")
        completed = subprocess.run(
            ["unshare", "--user", "--map-root-user", "--net", *inner],
            env=environment,
            check=False,
        )
        return completed.returncode

    loopback_setup = subprocess.run(["ip", "link", "set", "lo", "up"], check=False)
    if loopback_setup.returncode != 0:
        write_journal(args.journal, {
            "schema": "qualiopi19-network-confinement-v1",
            "checked_at": utc_now(),
            "verdict": "FAIL",
            "reason": "loopback_setup_failed",
        })
        return 70
    report = namespace_preflight()
    write_journal(args.journal, report)
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
    if report["verdict"] != "PASS":
        print("STOP: confinement non prouvé; aucune commande de test exécutée.", file=sys.stderr)
        return 70
    if args.check_only:
        return 0

    command = args.command
    if command and command[0] == "--":
        command = command[1:]
    if not command:
        return 0
    environment = sanitized_environment(args.journal)
    environment[MARKER] = "active"
    completed = subprocess.run(command, env=environment, check=False)
    report["command"] = command
    report["command_exit_code"] = completed.returncode
    report["finished_at"] = utc_now()
    write_journal(args.journal, report)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
