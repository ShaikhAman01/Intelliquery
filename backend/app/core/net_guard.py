"""Outbound target validation for user-supplied database connections."""

import ipaddress
import socket

_BLOCKED_HOSTNAMES = {"localhost", "localhost.localdomain", "metadata.google.internal"}

# db_type values a user is allowed to supply. sqlite is excluded on purpose:
# it maps to a filesystem path, so accepting it lets a caller read any SQLite
# file on the server. The built-in sample connection is created server-side
# and never passes through here.
ALLOWED_DB_TYPES = {"postgres", "postgresql", "cockroach", "mysql", "mariadb", "mssql"}


class BlockedTarget(Exception):
    pass


def _is_blocked_ip(ip: ipaddress._BaseAddress) -> bool:
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def assert_db_type_allowed(db_type: str) -> None:
    if (db_type or "").lower() not in ALLOWED_DB_TYPES:
        raise BlockedTarget(f"Unsupported database type: {db_type}")


def assert_host_allowed(host: str) -> None:
    """
    Reject hosts that resolve into private, loopback or link-local space.

    Resolves every A/AAAA record, so a public name pointing at 127.0.0.1 or at
    a cloud metadata endpoint is caught too.
    """
    name = (host or "").strip().strip("[]").lower()
    if not name:
        raise BlockedTarget("Host is required.")
    if name in _BLOCKED_HOSTNAMES or name.endswith(".localhost") or name.endswith(".internal"):
        raise BlockedTarget("That host is not allowed.")

    try:
        literal = ipaddress.ip_address(name)
    except ValueError:
        literal = None

    if literal is not None:
        if _is_blocked_ip(literal):
            raise BlockedTarget("That host is not allowed.")
        return

    try:
        infos = socket.getaddrinfo(name, None)
    except socket.gaierror:
        raise BlockedTarget("Could not resolve that host.")

    for info in infos:
        addr = info[4][0]
        try:
            resolved = ipaddress.ip_address(addr)
        except ValueError:
            continue
        if _is_blocked_ip(resolved):
            raise BlockedTarget("That host is not allowed.")


def assert_target_allowed(db_type: str, host: str) -> None:
    assert_db_type_allowed(db_type)
    assert_host_allowed(host)
