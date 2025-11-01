import { IMaterial } from './material';

export interface IUsedMaterial {
  material: IMaterial;
  quantity: number;
}

export interface ITask {
  _id?: string;
  name: string;
  duration: number; // in minutes
  description: string;
  startAt?: Date | string; // optional start date/time for the task (Date object or ISO string)
  usedMaterials: IUsedMaterial[];
  producedMaterials?: IUsedMaterial[]; // added: produced materials
}

export interface ITaskGroup {
  _id: string;
  name: string;
  tasks: ITask[];
  createdAt: string;
  updatedAt: string;
}
