import * as cdk from "aws-cdk-lib/core";

import * as cognito from "aws-cdk-lib/aws-cognito";

import { Construct } from "constructs";

import * as lambda from "aws-cdk-lib/aws-lambda";

import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

import * as path from "path";

import * as iam from "aws-cdk-lib/aws-iam";


export class Autenticacao extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const posConfirmacao = new NodejsFunction(this, "PosConfirmacao", {
      entry: path.join(__dirname, "../../lambda/pos-confirmacao/index.ts"),

      runtime: lambda.Runtime.NODEJS_22_X,

      timeout: cdk.Duration.seconds(10),

      memorySize: 128,
    });


    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "marketplace-usuarios",

      selfSignUpEnabled: true, // Permite que qualquer pessoa se cadastre livremente

      signInAliases: { email: true }, // Define que o e-mail será usado como login

      autoVerify: { email: true }, // Cognito envia automaticamente um código para confirmar o e-mail

      removalPolicy: cdk.RemovalPolicy.DESTROY, // Permite apagar tudo ao rodar `cdk destroy` (apenas para fins didáticos!)

      customAttributes: {
        role: new cognito.StringAttribute({
          minLen: 1,
          maxLen: 20,
          mutable: false,
        }), // mutable: false evita que mude depois
      },

      passwordPolicy: {
        minLength: 8,

        requireLowercase: true,

        requireUppercase: true,

        requireDigits: true,

        requireSymbols: false,
      },

      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    posConfirmacao.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cognito-idp:AdminAddUserToGroup"], // Libera apenas essa exata ação

        resources: [
          cdk.Stack.of(this).formatArn({
            service: "cognito-idp",

            resource: "userpool",

            resourceName: "*", // Aponta para os userpools da conta atual
          }),
        ],
      }),
    );


    this.userPoolClient = this.userPool.addClient("AppClient", {
      userPoolClientName: "marketplace-frontend",
      generateSecret: false, // Site roda no navegador: não dá para esconder um secret
      authFlows: { userSrp: true }, // Protocolo SRP: Login seguro onde a senha não viaja pela rede em texto puro
      preventUserExistenceErrors: true, // Segurança: evita revelar se um e-mail já existe na base (previne enumeração)

      readAttributes: new cognito.ClientAttributes()

        .withStandardAttributes({ email: true, emailVerified: true })

        .withCustomAttributes("role"),

      writeAttributes: new cognito.ClientAttributes()

        .withStandardAttributes({ email: true })

        .withCustomAttributes("role"),
    });

    new cognito.CfnUserPoolGroup(this, "GrupoCliente", {
      userPoolId: this.userPool.userPoolId,

      groupName: "cliente",

      description: "Compradores do marketplace",
    });

    new cognito.CfnUserPoolGroup(this, "GrupoVendedor", {
      userPoolId: this.userPool.userPoolId,

      groupName: "vendedor",

      description: "Vendedores que cadastram produtos",
    });

  }
}
