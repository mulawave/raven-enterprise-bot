# CRITICAL DEPLOYMENT LAWS - Raven Enterprise Bot

**MUST BE OBEYED WITH UTMOST SEVERITY**

**FAILURE TO OBEY THESE LAWS MEANS FATAL TERMINATION OF THE ENTIRE PROJECT**

---

## Law 1: Port 3000 Restriction

The server is a **shared server**. You **MUST NOT** reconfigure port 3000.

- Port 3000 is likely used by other applications on the shared server
- Raven Enterprise uses ports 4010 (backend API), 4011 (dashboard), and 4012 (admin console)
- Never attempt to bind, reconfigure, or interfere with port 3000

---

## Law 2: Domain Isolation

Lock all activities to **STRICTLY raven-ai.online**.

It is **FORBIDDEN** to:
- Access any other domain residing on the server
- Manage or attempt to interfere with other domains
- Modify configurations for domains other than raven-ai.online
- Read, write, or execute operations on other domain directories

---

## Law 3: Apache and Localhost Configuration

Apache and localhost configuration must be **EXPLICITLY on the raven-ai.online cPanel only** and **NOT on the root**.

- Do not modify root-level Apache configurations
- All Apache configuration changes must be scoped to raven-ai.online cPanel
- Localhost references must be isolated to raven-ai.online context
- Never touch system-wide Apache configurations

---

## Law 4: cPanel and Subdomain Isolation

All operations must remain in the **raven-ai.online cPanel and subdomains**.

- There are other applications running on the same server in several other domains
- These applications have **live users** and must **NOT be disturbed**
- Operations must be scoped to:
  - raven-ai.online (main domain)
  - api.raven-ai.online (backend API)
  - app.raven-ai.online (tenant dashboard)
  - admin.raven-ai.online (admin console)
- Never operate on other cPanel accounts or subdomains

---

## Enforcement

These laws apply to:
- **ALL** server interactions
- **ALL** deployments
- **ALL** configurations
- **ALL** modifications
- **ALL** automated scripts
- **ALL** manual operations

Before performing any server operation, verify:
1. The operation is scoped to raven-ai.online or its subdomains
2. The operation does not touch port 3000
3. The operation does not modify root-level Apache configurations
4. The operation cannot interfere with other domains or applications

---

## References

These laws are stored in:
- Repo memory (automatically invoked on server interactions)
- `.github/copilot-instructions.md` (GitHub Copilot instructions)
- `.github/instructions/backend-prisma-deploy.instructions.md` (Backend deployment guardrails)
- `docs/DEPLOYMENT-LAWS.md` (This file)

**Violations of these laws will result in fatal termination of the entire project.**
