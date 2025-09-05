import { PrismaClient } from '@prisma/client';
import { CreateSessionDto, UpdateSessionDto } from '../types';
import { Session } from '@prisma/client';

const prisma = new PrismaClient();

export class SessionService {
  async createSession(data: CreateSessionDto): Promise<Session> {
    return await prisma.session.create({
      data: {
        name: data.name,
        date: new Date(data.date),
      },
    });
  }

  async getAllSessions(): Promise<Session[]> {
    return await prisma.session.findMany({
      orderBy: {
        date: 'desc',
      },
    });
  }

  async getSessionById(id: string): Promise<Session | null> {
    return await prisma.session.findUnique({
      where: { id },
      include: {
        transcriptions: {
          select: {
            id: true,
            source: true,
            status: true,
            originalFileName: true,
            uploadedAt: true,
          },
        },
        _count: {
          select: {
            transcriptions: true,
            mappings: true,
          },
        },
      },
    });
  }

  async updateSession(id: string, data: UpdateSessionDto): Promise<Session> {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.status !== undefined) updateData.status = data.status;

    return await prisma.session.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteSession(id: string): Promise<Session> {
    return await prisma.session.delete({
      where: { id },
    });
  }

  async getSessionWithSections(id: string): Promise<any> {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        transcriptions: {
          include: {
            sections: {
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        mappings: true,
      },
    });

    return session;
  }
}