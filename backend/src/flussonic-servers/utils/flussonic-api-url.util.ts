import { FlussonicServer } from '../entities/flussonic-server.entity';

/**
 * Builds a full URL under this server's Flussonic API base
 * (`https://{domain}:443/{base}/{version}/{pathSuffix}` if SSL, else
 * `http://{hostname}:{port}/{base}/{version}/{pathSuffix}`) — see
 * FlussonicServerStatsService.sync for the original rule this generalizes.
 */
export function buildFlussonicApiUrl(
  server: FlussonicServer,
  pathSuffix: string,
): string {
  const basePath = server.api_base_path.replace(/^\/+|\/+$/g, '');
  const path = `${basePath}/${server.api_version_tag}/${pathSuffix}`;

  if (server.use_ssl) {
    const host = server.domain || server.hostname;
    return `https://${host}:443/${path}`;
  }
  return `http://${server.hostname}:${server.port}/${path}`;
}
