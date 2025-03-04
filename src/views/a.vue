<template>
	<!-- 其他登录表单元素 -->
	<el-form>
		<el-form-item label="用户名">
			<el-input v-model="username" placeholder="请输入用户名"></el-input>
		</el-form-item>
		<el-form-item label="密码">
			<el-input v-model="password" type="password" placeholder="请输入密码"></el-input>
		</el-form-item>
		<el-form-item>
			<el-button type="primary" @click="passwordLogin">登录</el-button>
		</el-form-item>
	</el-form>

	<!-- 显示二维码（首次绑定） -->
	<el-dialog v-model="showQRCode" title="绑定双因素认证">
		<p>请使用 Microsoft Authenticator 扫描以下二维码：</p>
		<img :src="qrCodeURL" alt="QR Code" />
		<p>扫描完成后，请输入验证码：</p>
		<el-input v-model="twoFACode" placeholder="请输入验证码"></el-input>
		<template #footer>
			<span class="dialog-footer">
				<el-button @click="showQRCode = false">取消</el-button>
				<el-button type="primary" @click="verify2FA">验证</el-button>
			</span>
		</template>
	</el-dialog>

	<!-- 输入验证码（已绑定） -->
	<el-dialog v-model="show2FAInput" title="双因素认证">
		<p>请打开 Microsoft Authenticator，查看并输入验证码：</p>
		<el-input v-model="twoFACode" placeholder="请输入验证码"></el-input>
		<template #footer>
			<span class="dialog-footer">
				<el-button @click="show2FAInput = false">取消</el-button>
				<el-button type="primary" @click="verify2FA">验证</el-button>
			</span>
		</template>
	</el-dialog>
	</div>
</template>

<script setup>
  import { ref } from 'vue';
  
  const username = ref('');
  const password = ref('');
  const twoFACode = ref('');
  const qrCodeURL = ref('');
  const showQRCode = ref(false);
  const show2FAInput = ref(false);
  
  // passwordLogin 函数如上所示
  
  const verify2FA = async () => {
	// 实现验证 2FA 的逻辑
	// 可能需要发送 twoFACode.value 到服务器进行验证
	// 验证成功后调用 handleLoginSuccess
  };
  
  const handleLoginSuccess = (data) => {
	// 处理登录成功的逻辑
  };
  </script>