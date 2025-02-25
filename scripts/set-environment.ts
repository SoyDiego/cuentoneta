/**
 * Script para generar el archivo de environment utilizado por Angular.
 * Este script debe ejecutarse como paso previo a la compilación de la aplicación
 * (build step).
 *
 * Para mejorar los tiempos de carga del paint inicial de la aplicación, la con-
 * figuración de contenido se obtiene desde las variables de entorno y se deposita
 * en el archivo de environment.ts, el cual es compilado junto con la aplicación.
 *
 * Autor: @rolivencia
 */

// Importar cliente de Sanity
import { client } from '../src/api/_helpers/sanity-connector';

// Interfaces
import { StorylistDeckConfig } from '../src/app/models/content.model';

// NodeJS & env
import { writeFile, existsSync, mkdirSync } from 'fs';
import * as dotenv from 'dotenv';
import ErrnoException = NodeJS.ErrnoException;

// Tipo que describe los diferentes tipos de ambientes en los que puede ejecutarse el presente script
type TEnvironmentType = 'development' | 'preview' | 'staging' | 'production';

// Leer variables de entorno desde .env
dotenv.config();

const dirPath = `src/app/environments`;
const targetPath = `${dirPath}/environment.ts`;

// Genera una ruta absoluta a la API en función del ambiente
const generateApiUrl = (
  environment: TEnvironmentType,
  branchUrl: string
): string => {
  let url = '';

  // Asigna URL en base a variables de entorno para producción y staging (preview develop)
  if (environment === 'production' || branchUrl === stagingBranchUrl) {
    url = process.env['CUENTONETA_WEBSITE'] as string;
  }
  // Lectura de la variable de entorno de Vercel para deployments de preview
  else if (environment === 'preview') {
    url = `https://${process.env['VERCEL_URL']}/` as string;
  }

  return url;
};

// Constantes para generar el archivo de environment
const environment: TEnvironmentType =
  (process.env['VERCEL_ENV'] as TEnvironmentType) ?? 'development';

const branchUrl: string = process.env['VERCEL_BRANCH_URL'] as string;
const stagingBranchUrl = 'cuentoneta-git-develop-rolivencia.vercel.app';

const apiUrl = generateApiUrl(environment, branchUrl);

// Obtiene la vista de preview para generar skeletons
const fetchStorylistsPreviewDeckConfig = () =>
  client.fetch(
    `*[_type == 'storylist']
                    { 
                        'slug': slug.current,
                        'title': title,
                        'ordering': previewGridConfig.ordering,
                        'orderInLandingPage': previewGridConfig.landingPageOrder,
                        'previewGridSkeletonConfig': {
                            'gridTemplateColumns': previewGridConfig.gridTemplateColumns,
                            'titlePlacement': previewGridConfig.titlePlacement,
                            'cardsPlacement': previewGridConfig.cardsPlacement[] {
                              'order': order,
                              'slug': @.publication.story->slug.current,
                              'startCol': startCol,
                              'imageSlug': imageSlug.current,
                              'endCol': endCol,
                              'startRow': startRow,
                              'endRow': endRow,
                            }
                        },
                        'gridSkeletonConfig': {
                            'gridTemplateColumns': gridConfig.gridTemplateColumns,
                            'titlePlacement': gridConfig.titlePlacement,
                            'cardsPlacement': gridConfig.cardsPlacement[] {
                              'order': order,
                              'slug': @.publication.story->slug.current,
                              'startCol': startCol,
                              'imageSlug': imageSlug.current,
                              'endCol': endCol,
                              'startRow': startRow,
                              'endRow': endRow,
                            }
                        }
                    } | order(orderInLandingPage asc)`
  );

fetchStorylistsPreviewDeckConfig().then((storylists: StorylistDeckConfig[]) => {
  // Accede a las variables de entorno y genera un string
  // correspondiente al objeto environment que utilizará Angular
  const environmentFileContent = `
    export const environment = {
       environment: "${environment}",
       contentConfig: ${JSON.stringify(
         storylists
           .filter(
             (storylist: any) =>
               !!storylist.previewGridSkeletonConfig.cardsPlacement
           )
           .map((storylist: any) => ({
             ...storylist,
             amount: storylist.previewGridSkeletonConfig.cardsPlacement.filter(
               (card: any) => !!card.slug
             ).length,
           }))
       )},
       website: "${process.env['CUENTONETA_WEBSITE']}",
       apiUrl: "${apiUrl}"
    };
`;

  // En caso de que no exista el directorio environments, se lo crea
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath);
  }

  // Escribe el contenido en el archivo correspondiente environment.ts
  writeFile(
    targetPath,
    environmentFileContent,
    { flag: 'w' },
    function (err: ErrnoException | null) {
      if (err) {
        console.log(err);
        return;
      }
      console.log(`Variables de entorno escritas en ${targetPath}`);
      console.log(
        'Ambiente de Vercel - VERCEL_ENV = ',
        process.env['VERCEL_ENV']
      );
      console.log(
        'URL de branch de Vercel - VERCEL_BRANCH_URL = ',
        process.env['VERCEL_BRANCH_URL']
      );
      console.log('URL de API = ', apiUrl);
    }
  );
});
