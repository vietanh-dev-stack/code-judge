/**
 * AUTH-H-01 (password policy)
 */
import { BadRequestException } from '@nestjs/common';
import { validatePasswordPolicy } from './password-policy';

describe('validatePasswordPolicy', () => {
  it('accepts strong password', () => {
    expect(() => validatePasswordPolicy('Abcdef1!')).not.toThrow();
  });

  it('rejects short password', () => {
    expect(() => validatePasswordPolicy('Ab1!')).toThrow(BadRequestException);
  });

  it('rejects password without special char', () => {
    expect(() => validatePasswordPolicy('Abcdef12')).toThrow(BadRequestException);
  });
});
