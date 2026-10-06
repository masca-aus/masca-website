import { expect, it } from 'vitest';
import configPromise from '@payload-config';
it('registers automatic compression before CMS upload selections reach Payload', async () => {
  const config = await configPromise;
  expect(config.admin.components?.providers).toContain('/components/admin/ImageUploadCompression#ImageUploadCompression');
});
