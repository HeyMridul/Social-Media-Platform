"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("./user.schema");
let UsersService = class UsersService {
    constructor(userModel) {
        this.userModel = userModel;
    }
    async me(userId) {
        const user = await this.userModel.findById(userId).lean();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return {
            id: user._id,
            email: user.email,
            username: user.username,
            bio: user.bio,
            avatar: user.avatar,
            followersCount: user.followers.length,
            followingCount: user.following.length,
        };
    }
    async follow(currentUserId, targetUserId) {
        const current = await this.userModel.findById(currentUserId);
        const target = await this.userModel.findById(targetUserId);
        if (!current || !target)
            throw new common_1.NotFoundException('User not found');
        const targetObjId = new mongoose_2.Types.ObjectId(targetUserId);
        const currentObjId = new mongoose_2.Types.ObjectId(currentUserId);
        if (!current.following.some((id) => id.equals(targetObjId))) {
            current.following.push(targetObjId);
            await current.save();
        }
        if (!target.followers.some((id) => id.equals(currentObjId))) {
            target.followers.push(currentObjId);
            await target.save();
        }
        return { success: true };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map