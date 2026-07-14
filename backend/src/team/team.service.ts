import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTeamMemberDto, UpdateTeamMemberDto } from './dto/team.dto';
import { TeamMember } from './team-member.entity';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(TeamMember)
    private readonly teamRepo: Repository<TeamMember>,
  ) {}

  findAll() {
    return this.teamRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  findActive() {
    return this.teamRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const member = await this.teamRepo.findOne({ where: { id } });
    if (!member) throw new NotFoundException('Team member not found');
    return member;
  }

  create(dto: CreateTeamMemberDto) {
    const member = this.teamRepo.create({
      name: dto.name,
      roleTitle: dto.roleTitle,
      bio: dto.bio ?? null,
      photoUrl: dto.photoUrl ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });
    return this.teamRepo.save(member);
  }

  async update(id: string, dto: UpdateTeamMemberDto) {
    const member = await this.findOne(id);
    Object.assign(member, dto);
    return this.teamRepo.save(member);
  }

  async remove(id: string) {
    const member = await this.findOne(id);
    await this.teamRepo.remove(member);
    return { ok: true };
  }
}
