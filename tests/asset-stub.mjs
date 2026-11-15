import { register } from 'node:module';

const loaderCode = `
export async function load(url, context, nextLoad) {
  if (/\\.(png|jpe?g|webp|gif|svg|css)(\\?.*)?$/i.test(url)) {
    return { format: 'module', shortCircuit: true, source: 'export default "";' };
  }
  return nextLoad(url, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(loaderCode)}`, import.meta.url);
