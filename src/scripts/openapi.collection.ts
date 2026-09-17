import fs from 'node:fs';
import { generateOpenAPIDocument } from '../config/docs';
import { logger } from '../config/logger';

const document = generateOpenAPIDocument();

fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2));

logger.info('OpenAPI specification generated successfully.');
