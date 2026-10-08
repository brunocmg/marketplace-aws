import type { PostConfirmationTriggerHandler } from "aws-lambda";

import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";

// NOVO: instanciado fora do handler (melhor prática de performance Lambda)

const cognito = new CognitoIdentityProviderClient({});

const GRUPOS_PERMITIDOS = ["cliente", "vendedor"];

const GRUPO_PADRAO = "cliente";

export const handler: PostConfirmationTriggerHandler = async (event) => {
  if (event.triggerSource !== "PostConfirmation_ConfirmSignUp") {
    return event;
  }

  const perfilEscolhido = event.request.userAttributes["custom:perfil"];

  const grupo = GRUPOS_PERMITIDOS.includes(perfilEscolhido)
    ? perfilEscolhido
    : GRUPO_PADRAO;

  // NOVO: Chama a API do Cognito de forma ativa para inserir no grupo

  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: event.userPoolId,

      Username: event.userName,

      GroupName: grupo,
    }),
  );

  console.log(`Usuário ${event.userName} adicionado ao grupo "${grupo}"`);

  return event;
};
