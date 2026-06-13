import { Entity } from '@mitama/core';
import type { SettingValue } from './settings-catalog';

interface SettingProps {
  key: string;
  storeId: string | null;
  value: SettingValue;
  createdAt: Date;
  updatedAt: Date;
}

export class Setting extends Entity<SettingProps> {
  static create(props: { key: string; storeId: string | null; value: SettingValue }): Setting {
    const now = new Date();
    return new Setting(crypto.randomUUID(), {
      key: props.key,
      storeId: props.storeId,
      value: props.value,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Reconstruye la entidad desde persistencia, sin regenerar id ni fechas. */
  static rehydrate(props: SettingProps, id: string): Setting {
    return new Setting(id, props);
  }

  get key(): string {
    return this.props.key;
  }

  get storeId(): string | null {
    return this.props.storeId;
  }

  get value(): SettingValue {
    return this.props.value;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateValue(value: SettingValue, now: Date): void {
    this.props.value = value;
    this.props.updatedAt = now;
  }
}
