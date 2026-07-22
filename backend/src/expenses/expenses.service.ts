import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { Expense } from './expense.entity';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expensesRepo: Repository<Expense>,
  ) {}

  private stripUser(expense: Expense) {
    if (expense.createdBy) {
      const { passwordHash: _, ...safe } = expense.createdBy as typeof expense.createdBy & {
        passwordHash?: string;
      };
      expense.createdBy = safe as typeof expense.createdBy;
    }
    return expense;
  }

  async create(userId: string, dto: CreateExpenseDto) {
    const expense = this.expensesRepo.create({
      title: dto.title.trim(),
      note: dto.note?.trim() || null,
      amount: dto.amount,
      expenseDate: dto.expenseDate.slice(0, 10),
      createdById: userId,
    });
    const saved = await this.expensesRepo.save(expense);
    return this.findOne(saved.id);
  }

  async findAll(from?: string, to?: string) {
    const today = new Date();
    const fromStr = (from || today.toISOString().slice(0, 10)).slice(0, 10);
    const toStr = (to || today.toISOString().slice(0, 10)).slice(0, 10);

    const items = await this.expensesRepo.find({
      where: { expenseDate: Between(fromStr, toStr) },
      relations: { createdBy: true },
      order: { expenseDate: 'DESC', createdAt: 'DESC' },
    });

    const safe = items.map((e) => this.stripUser(e));
    const totalAmount = safe.reduce((s, e) => s + Number(e.amount), 0);

    return {
      from: fromStr,
      to: toStr,
      count: safe.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      items: safe,
    };
  }

  async findOne(id: string) {
    const expense = await this.expensesRepo.findOne({
      where: { id },
      relations: { createdBy: true },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return this.stripUser(expense);
  }

  async update(id: string, dto: UpdateExpenseDto) {
    const expense = await this.findOne(id);
    if (dto.title !== undefined) expense.title = dto.title.trim();
    if (dto.note !== undefined) expense.note = dto.note.trim() || null;
    if (dto.amount !== undefined) expense.amount = dto.amount;
    if (dto.expenseDate !== undefined) {
      expense.expenseDate = dto.expenseDate.slice(0, 10);
    }
    await this.expensesRepo.save(expense);
    return this.findOne(id);
  }

  async remove(id: string) {
    const expense = await this.findOne(id);
    await this.expensesRepo.remove(expense);
    return { ok: true };
  }
}
