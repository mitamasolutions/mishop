/**
 * API pública del módulo activity-log. Otros paquetes SOLO pueden importar de aquí
 * (regla 3 de arquitectura). Los eventos compartidos viven en @mitama/contracts.
 */
export { ActivityLogModule } from './activity-log.module';
export { recordActivity } from './record-activity';
export type { RecordActivityInput } from './record-activity';
