import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PASSWORD_POLICY_MESSAGE, validatePasswordPolicy } from '../utils/password-policy';

@ValidatorConstraint({ name: 'IsStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: unknown): boolean {
    if (typeof password !== 'string') {
      return false;
    }
    try {
      validatePasswordPolicy(password);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return PASSWORD_POLICY_MESSAGE;
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
