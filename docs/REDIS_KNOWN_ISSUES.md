# Known Issues with Local Redis Setup

## DNS Resolution in Docker Containers (serverless-redis-http)

### Issue

The `serverless-redis-http` container cannot resolve the `redis` service hostname through Docker's embedded DNS resolver in certain environments (particularly in CI/CD environments like GitHub Actions, Codespaces, or some Dev Container configurations).

### Symptoms

- `pnpm redis:start` successfully starts both containers
- Both containers appear healthy in `docker ps`
- TCP connectivity works when using IP addresses directly
- HTTP requests to `http://localhost:8079` return 500 errors with message: "SRH: Unable to connect to the Redis server"
- Logs show timeout errors: `** (EXIT) time out` when trying to connect to Redis

### Root Cause

The Elixir/OTP runtime used by serverless-redis-http appears to have issues resolving Docker service names through Docker's embedded DNS in certain network configurations. While `getent hosts redis` from within the container times out or fails, direct IP connectivity works fine (`nc -zv <IP> 6379` succeeds).

### Workarounds

1. **Use MSW (Recommended for CI/CD)**
   - MSW provides a fully functional Redis mock without Docker
   - Already implemented in `packages/msw-handlers/src/handlers/upstash.ts`
   - Works in all environments (local, CI, Codespaces)
   - Configured via `UPSTASH_REDIS_REST_URL=https://fake.upstash.test`

2. **Use Local Docker (Recommended for Local Development)**
   - Works on most local development machines (macOS, Windows, Linux)
   - May fail in certain containerized environments (GitHub Actions, etc.)
   - Test with `pnpm redis:start` and verify with `curl -X POST http://localhost:8079 -H "Authorization: Bearer local_development_token" -H "Content-Type: application/json" -d '["PING"]'`

3. **Use Production Upstash (For Integration Testing)**
   - Create a separate Upstash Redis instance for testing
   - Configure with actual credentials

### Environment-Specific Behavior

| Environment | Docker Compose | MSW | Production Upstash |
|-------------|---------------|-----|-------------------|
| Local Machine (macOS/Windows/Linux) | ✅ Usually works | ✅ Always works | ✅ Always works |
| GitHub Codespaces | ⚠️ May not work | ✅ Always works | ✅ Always works |
| Dev Containers | ⚠️ May not work | ✅ Always works | ✅ Always works |
| GitHub Actions CI | ❌ Known to fail | ✅ Always works | ✅ Always works |
| Local Docker Desktop | ✅ Usually works | ✅ Always works | ✅ Always works |

### Recommended Approach by Use Case

1. **Unit Tests**: Use MSW
2. **CI/CD**: Use MSW
3. **Coding Agent Environments**: Use MSW  
4. **Local Feature Development**: Try Docker Compose first, fallback to MSW if it doesn't work
5. **Integration Testing**: Use production Upstash test instance

### Future Improvements

Potential solutions to explore:
1. Use a different Redis HTTP proxy that doesn't have DNS resolution issues
2. Configure custom DNS resolvers in serverless-redis-http
3. Use host networking mode (though this has security implications)
4. Build a simple Node.js-based Redis HTTP proxy as an alternative
5. Use Redis Stack with built-in HTTP interface

### References

- [serverless-redis-http GitHub](https://github.com/hiett/serverless-redis-http)
- [Docker Embedded DNS Documentation](https://docs.docker.com/config/containers/container-networking/#dns-services)
- [Elixir inet Configuration](https://www.erlang.org/doc/apps/ert/inet_cfg.html)
