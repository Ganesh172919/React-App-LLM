# Deploy MedAssist AI to Amazon EC2

Use one EC2 instance to run the React site, Express API, WebSocket server, and MongoDB. Caddy serves HTTPS and forwards traffic to the existing Nginx frontend. The API and database communicate over the Compose network.

## Provision the instance

1. Complete [AWS account signup](https://docs.aws.amazon.com/accounts/latest/reference/sign-in-new.html) and confirm the account is on the Free plan. It expires after six months or when you exhaust your credits. EC2, EBS, and public IPv4 consume available credits. See the [AWS Free Tier FAQ](https://aws.amazon.com/free/free-tier-faqs/).
2. Launch an x86-64 Ubuntu 24.04 LTS instance. Choose a Free Tier eligible `t3.small` or larger size that fits your credit budget. Enable IMDSv2, use an encrypted gp3 root volume, and set T3 CPU credits to Standard. Allow TCP 80 and 443 publicly and TCP 22 from your management IP only.
3. Associate an Elastic IP for stable DNS. Install Git and [Docker Engine with the Compose plugin](https://docs.docker.com/engine/install/ubuntu/) on the instance. Use Compose 2.24.4 or newer.

## Configure and start

Clone the branch containing this guide. Start on the EC2 host with a fresh configuration and database volume.

```bash
git clone --branch codex/aws-ec2-deploy https://github.com/Ganesh172919/React-App-LLM.git
cd React-App-LLM
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/repo" -w /repo node:24-alpine node deploy/create_env.cjs
```

Edit the generated root `.env` through the instance's administrative shell. Save the generated secrets securely for backups and restarts. Set the browser-visible origin and enable secure cookies.

```dotenv
PUBLIC_ORIGIN=https://medassist-203-0-113-10.sslip.io
COOKIE_SECURE=true
AI_PROVIDER=groq
```

Replace the example IP in the hostname with the instance's real public IPv4 address, using dashes in place of dots. [sslip.io](https://sslip.io/) resolves the address embedded in the hostname without a registrar account. For a registered domain, point its DNS A record at the instance and set `PUBLIC_ORIGIN` to that origin. Caddy needs TCP 80 and 443 reachable for certificate issuance and renewal.

Set `GROQ_API_KEY` for Groq, or use `AI_PROVIDER=openrouter` and `OPENROUTER_API_KEY` for OpenRouter's free router. For email signup and password recovery, configure a working `BREVO_API_KEY` and verified `EMAIL_FROM_ADDRESS`. See the [configuration reference](../../reference/configuration.md) for other providers and optional Google sign-in.

```bash
docker compose -f docker-compose.yml -f deploy/compose.ec2.yml config --quiet
docker compose -f docker-compose.yml -f deploy/compose.ec2.yml up -d --build --wait
```

## Verify the public deployment

Run these checks after DNS and TLS are ready. The readiness response should show `database: "connected"`. Check the provider and email flags against the intended deployment.

```bash
PUBLIC_ORIGIN=https://medassist-203-0-113-10.sslip.io
curl --fail --show-error "$PUBLIC_ORIGIN/"
curl --fail --show-error "$PUBLIC_ORIGIN/api/ready"
```

Use a synthetic account to verify email signup, HTTPS session cookies, a chat response, saved history, and WebSocket updates in a second tab. Review the [release gates](../../CURRENT_CAPABILITIES_AND_RELEASE_GATES.md) before opening the app to real users.

**Evidence:** `docker-compose.yml`, `deploy/compose.ec2.yml`, `deploy/Caddyfile`, `deploy/create_env.cjs`, `frontend/nginx.conf`, `backend/app.js` (`/api/ready`), `backend/services/websocketService.js` (`attachWebSockets`).
