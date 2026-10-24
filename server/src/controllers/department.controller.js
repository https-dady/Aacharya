import mongoose from 'mongoose';

import { Department } from '../models/department.model.js';
import { User, USER_ROLES } from '../models/user.model.js';

export async function createDepartmentController(req, res, next) {
  try {
    const currentUser = await User.findById(req.user?.id)
      .select('role status');

    if (
      !currentUser
      || currentUser.status !== 'ACTIVE'
      || currentUser.role !== USER_ROLES.SUPER_ADMIN
    ) {
      const error = new Error(
        'Only an active Super Admin can create departments.',
      );

      error.statusCode = currentUser ? 403 : 401;
      error.code = currentUser ? 'FORBIDDEN' : 'UNAUTHORIZED';

      return next(error);
    }

    const {
      name,
      code,
      description = '',
    } = req.body;

    const normalizedCode = code.trim().toUpperCase();

    const existingDepartment = await Department.exists({
      code: normalizedCode,
    });

    if (existingDepartment) {
      const error = new Error(
        'A department with this code already exists.',
      );

      error.statusCode = 409;
      error.code = 'DEPARTMENT_CODE_EXISTS';

      return next(error);
    }

    const department = await Department.create({
      name: name.trim(),
      code: normalizedCode,
      description: description.trim(),
      createdBy: currentUser._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      data: {
        department: {
          id: department.id,
          name: department.name,
          code: department.code,
          description: department.description,
          hod: department.hod,
          status: department.status,
          createdAt: department.createdAt,
        },
      },
    });
  } catch (error) {
    if (
      error instanceof mongoose.Error
      && error.name === 'ValidationError'
    ) {
      error.statusCode = 422;
      error.code = 'VALIDATION_ERROR';
    }

    if (error?.code === 11000) {
      error.statusCode = 409;
      error.code = 'DEPARTMENT_CODE_EXISTS';
      error.message = 'A department with this code already exists.';
    }

    return next(error);
  }
}