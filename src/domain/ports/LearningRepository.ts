import type { Learning } from '../models/Learning'

export interface LearningRepository {
  save(learning: Learning): Promise<void>
  findById(id: string): Promise<Learning | null>
  findAll(): Promise<Learning[]>
  remove(id: string): Promise<boolean>
  clear(): Promise<void>
}
